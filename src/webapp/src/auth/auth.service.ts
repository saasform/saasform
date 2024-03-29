import { Injectable, UnauthorizedException } from '@nestjs/common'
import { UsersService } from '../accounts/services/users.service'
import { AccountsService } from '../accounts/services/accounts.service'
import { RequestUser, ValidUser } from './interfaces/user.interface'

import { JwtService } from '@nestjs/jwt'
import { parseDomain, ParseResultType } from 'parse-domain'

import { UserCredentialsService } from '../accounts/services/userCredentials.service'
import { UserEntity } from '../accounts/entities/user.entity'
import { AccountEntity } from '../accounts/entities/account.entity'
import { SettingsService } from '../settings/settings.service'
import { PaymentsService } from '../payments/services/payments.service'
import { PlansService } from '../payments/services/plans.service'
import { UserError } from '../utilities/common.model'
import { UserCredentialsEntity } from 'src/accounts/entities/userCredentials.entity'

export class UnauthorizedWithRedirectException extends UnauthorizedException {
  public redirect: string

  constructor (url: string) {
    super()
    this.redirect = url
  }
}

@Injectable()
export class AuthService {
  constructor (
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly accountsService: AccountsService,
    private readonly userCredentialsService: UserCredentialsService,
    private readonly settingsService: SettingsService,
    private readonly paymentsService: PaymentsService,
    private readonly plansService: PlansService
  ) {}

  async getUserInfo (email): Promise<ValidUser | null> {
    if (email == null) {
      return null
    }
    const credential = await this.userCredentialsService.findUserCredentialByEmail(email)
    if (credential == null) {
      console.error('auth.service - getUserInfo - credentials not valid', email)
      return null
    }

    const user = await this.usersService.findById(credential.userId)
    if (user == null) {
      console.error('auth.service - getUserInfo - userInfo not found', email)
      return null
    }

    const account = await this.accountsService.findByUserId(user.id)
    if (account == null) {
      console.error('auth.service - getUserInfo - account not found', user)
      return null
    }

    return { user, credential, account }
  }

  async getOrgSSORedirectUrl (accountWithOrg: AccountEntity): Promise<string> {
    const org = accountWithOrg?.data?.org ?? {}
    const { provider, domain } = org

    switch (provider) {
      case 'google':
        return '/auth/google'
      case 'azure':
        return '/auth/azure'
      case 'okta':
        return `/auth/okta?iss=https%3A%2F%2F${domain as string}`
    }
    return '/login'
  }

  async validateUser (email: string, inputPassword: string): Promise<ValidUser | null> {
    if (email == null) {
      return null
    }

    const validUser = await this.getUserInfo(email)
    if (validUser == null) {
      console.error('auth.service - validateUser - cannon get valid user info', email)
      return null
    }

    // [org] extract account from email domain, if any
    const accountWithOrg = await this.getAccountWithOrgByEmail(email)
    const forceProvider = accountWithOrg?.data?.org?.provider ?? null
    if (accountWithOrg != null && forceProvider != null && forceProvider !== 'password') {
      console.error('AuthService - validateUser - org required, invalid provider')
      const url = await this.getOrgSSORedirectUrl(accountWithOrg)
      throw new UnauthorizedWithRedirectException(url)
    }

    // [org] validate that org's account and actual account are the same
    if (accountWithOrg != null && accountWithOrg.id !== validUser.account.id) {
      console.error('AuthService - validateUser - org required, invalid account id')
      return null
    }

    if (inputPassword == null) {
      return null
    }

    const isRegistered = await this.userCredentialsService.isRegistered(validUser.credential, inputPassword)
    if (!isRegistered) {
      console.error('auth.service - validateUser - credentials not registered', email)
      return null
    }

    if (validUser.account.email_verification_required === true) {
      if (validUser.user.emailConfirmed !== true) {
        console.error('auth.service - validateUser - email not confirmed, but confirmation is required', email)
        return null
      }
    }

    return validUser
  }

  // TODO: move into AccountEntity
  async isPaymentMethodOK (account: AccountEntity): Promise<Boolean> {
    // when not set, it's false - e.g. in tests
    const paymentsConfig = await this.paymentsService.getPaymentsConfig()
    const payment = account.data.payment

    const configSignupForcePayment = (paymentsConfig.signup_force_payment === true)

    const isExternal = payment?.plan?.provider === 'external'
    const hasPaymentMethods = payment?.methods != null && payment.methods.length > 0

    const accountIsActive =
    // signup requires payment and account has payments
    (configSignupForcePayment && hasPaymentMethods) ||
    // signup doesn't require payment
    !configSignupForcePayment ||
    // enterprise are alwasy active
    isExternal
    // TODO not banned/blocked account

    return accountIsActive
  }

  // TODO: move into SubscriptionEntity
  async isSubscriptionPaid (payment): Promise<Boolean> {
    // when not set, it's false - e.g. in tests
    const paymentsConfig = await this.paymentsService.getPaymentsConfig()
    const configPaymentProcessorEnabled = (paymentsConfig.payment_processor_enabled === true)

    const subscription = payment?.sub
    const plan = payment?.plan

    if (subscription == null && plan == null) {
      return true
    }

    const subsIsActive =
    // no subs, but payment processor disabled
    (subscription?.status == null && !configPaymentProcessorEnabled) ||
    // no subs, e.g. enterprise or not yet added
    // (subscription?.status === undefined) || // this should never happen unless something was broken in subscription creation
    // valid subs in any of these states: disabled, external, active, trialing
    ['disabled', 'external', 'active', 'trialing'].includes(subscription?.status)

    return subsIsActive
  }

  // TODO: move into UserEntity
  async isUserActive (user: UserEntity): Promise<Boolean> {
    return user.isActive
  }

  async getTokenPayloadStatus (validUser: ValidUser): Promise<string> {
    const userIsActive = (await this.isUserActive(validUser.user) === true)
    const paymentMethodIsOK = (await this.isPaymentMethodOK(validUser.account) === true)
    const subsIsPaid = (await this.isSubscriptionPaid(validUser.account.data.payment) === true)

    if (userIsActive && paymentMethodIsOK && subsIsPaid) {
      return 'active'
    } else {
      if (!paymentMethodIsOK) {
        return 'no_payment_method'
      }
      if (!subsIsPaid) {
        return 'unpaid'
      }
      if (!userIsActive) {
        return 'inactive_user'
      }
    }

    return 'invalid'
  }

  getTokenPayloadSubscripionData (payment): any {
    // const payment = validUser.account.data.payment
    const subscriptionData: any = {}

    // subs_name
    if (payment?.plan?.name != null) {
      subscriptionData.subs_name = payment.plan.name
    }

    // subs_status
    if (payment?.sub?.status != null) {
      subscriptionData.subs_status = payment.sub.status
    }

    // subs_exp
    if (payment?.sub?.current_period_end != null) {
      subscriptionData.subs_exp = payment.sub.current_period_end
    }

    return subscriptionData
  }

  async getTokenPayloadFromUserModel (validUser: ValidUser, updateActiveSubscription: boolean = true): Promise<RequestUser | null> {
    if (validUser == null) {
      return null
    }

    // TODO cleanup
    const { allowedKeys } = await this.settingsService.getUserSettings()
    const userData = validUser.user.data.profile != null
      ? allowedKeys.filter((key) => !(['email', 'username']).includes(key)).reduce((acc, key: string) => {
        acc[`user_${key}`] = validUser.user.data.profile[key] ?? '' // using user_${key} to flatten the jwt data
        return acc
      }, {})
      : {}

    const subscriptionData = this.getTokenPayloadSubscripionData(validUser.account.data.payment)
    const status = await this.getTokenPayloadStatus(validUser)

    return {
      nonce: '', // TODO
      id: validUser.user.id,
      account_id: validUser.account?.id,
      account_name: validUser.account?.data.name ?? '',
      status: status,
      email: validUser.user.email,
      email_verified: validUser.user?.data.emailConfirmed ?? false,
      staff: validUser.user?.isAdmin ?? false,
      username: validUser.user.username ?? null,
      ...userData,
      ...subscriptionData
    }
  }

  getJwtCookieDomain (requestHostname: string, primaryDomain: string): string {
    let cookieDomain

    // if the request is from localhost or mysaasform.com, use the request's hostname
    if (requestHostname.endsWith('.localhost') || requestHostname.endsWith('.mysaasform.com')) { // TODO: remove hard coded value
      cookieDomain = requestHostname
    } else {
      // else use the primary domain set in admin/developers
      // to build the second level domain (e.g., beta.beautifulsaas.com -> beautifulsaas.com)
      const parseResult = parseDomain(primaryDomain)
      if (parseResult.type === ParseResultType.Listed) {
        const { domain, topLevelDomains } = parseResult
        cookieDomain = `${domain as string}.${topLevelDomains.join('.')}`
      } else {
        // if improperly set, fall back to the request's hostname
        cookieDomain = requestHostname
      }
    }
    return cookieDomain
  }

  async getJwtCookieOptions (request): Promise<any> {
    const settings = await this.settingsService.getWebsiteSettings()
    const cookieDomain = this.getJwtCookieDomain(request.hostname, settings.domain_primary)

    let options = { secure: true, httpOnly: true, domain: cookieDomain }

    if (process.env.NODE_ENV === 'development') { // TODO: better check for development mode
      options = { secure: false, httpOnly: false, domain: cookieDomain }
    }

    return options
  }

  async setJwtCookie (request, response, requestUser: RequestUser): Promise<string> {
    const jwt = await this.jwtService.sign(requestUser)
    const options = await this.getJwtCookieOptions(request)

    response.cookie('__session', jwt, options) // TODO: make cookie name parametric

    return jwt
  }

  async getUserIdentity (email: string): Promise<UserEntity | null> {
    const user = await this.usersService.findByEmail(email)
    return email != null ? user : null
  }

  async getAccountWithOrgByEmail (email: string): Promise<any> {
    const domain = email.split('@')[1]
    const account = await this.accountsService.getAccountByDomain(domain)
    return account
  }

  async getOrgByDomain (domain: string): Promise<any> {
    const account = await this.accountsService.getAccountByDomain(domain)
    const org = account?.data?.org ?? null
    return org
  }

  async createNewUser (newUser: any): Promise<ValidUser | UserError | null> {
    const { email } = newUser
    if (email == null) {
      console.error('auth.service - createNewUser - missing parameters', email)
      return null
    }

    const { password, _csrf, accountEmail, ...data } = newUser
    const user = await this.usersService.addUser({ email, password, data })
    if (user instanceof UserError || user == null) {
      console.error('auth.service - createNewUser - error while creating user', email, accountEmail, user)
      return user
    }

    const credential = await this.userCredentialsService.findUserCredentialByEmail(email)
    if (credential == null) {
      console.error('auth.service - createNewUser - error while finding user credential', email)
      return null
    }

    return { user, credential, account: null }
  }

  async registerUser (req: any): Promise<ValidUser | UserError | null> {
    const userData = req.body
    const chosenPlan = req?.cookies?.plan

    const newUser = await this.createNewUser(userData)
    if (newUser instanceof UserError || newUser == null) {
      console.error('auth.service - registerUser - error while creating user')
      return newUser
    }

    const { user, credential } = newUser
    const { email, accountEmail } = userData
    // We create a new acount for this user and add this as owner
    const account = await this.accountsService.addOrAttach({ data: { name: accountEmail ?? email }, user, chosenPlan })
    if (account == null) {
      console.error('auth.service - registerUser - error while creating account', email, accountEmail)
      return null
    }

    return { user, credential, account }
  }

  async userFind (email): Promise<ValidUser | null> {
    return await this.getUserInfo(email)
  }

  async userCreate (req, data): Promise<ValidUser | null> {
    const { provider, email } = data
    const chosenPlan = req?.cookies?.plan

    if (email == null) {
      console.error('auth.service - userCreate - missing parameters', email)
      return null
    }

    const userData = {
      emailConfirmed: data.email_verified
    }

    const user = await this.usersService.addUser({ email, password: null, data: userData })
    if (user instanceof UserError || user == null) {
      console.error('auth.service - userCreate - error while creating user', email, user)
      return null
    }

    const credential = await this.userCredentialsService.findUserCredentialByEmail(email)
    if (credential == null) {
      console.error('auth.service - userCreate - error while creating user credential', email, user)
      return null
    }
    credential.setProviderData(provider, data.subject, data.extra)
    const { id, ...cred } = credential
    await this.userCredentialsService.updateOne(id, cred)

    // We create a new acount for this user and add this as owner
    const accountEmail = email
    const account = await this.accountsService.addOrAttach({ data: { name: accountEmail ?? email }, user, chosenPlan })
    if (account == null) {
      console.error('auth.service - userCreate - error while creating account', email, accountEmail)
      return null
    }

    return { user, credential, account }
  }

  /*
    req - request
    data:
      - provider: string w/ provider name, stored in the credentials
      - subject: the user id within the social, used for validation
      - email: to fetch the user
      - email_verified: to allow/deny autoconnect
      - extra: data from the provider, stored at creation or connect
  */
  async userFindOrCreate (req, data): Promise<RequestUser | null> {
    const { email, provider } = data

    // [org] extract account from email domain, if any
    const accountWithOrg = await this.getAccountWithOrgByEmail(email)
    const forceProvider = accountWithOrg?.data?.org?.provider ?? null
    if (accountWithOrg != null && forceProvider != null && forceProvider !== provider) {
      console.error('AuthService - userFindOrCreate - org required, invalid provider')
      return null
    }

    // userFind
    let validUser = await this.userFind(email)

    // ...orCreate
    if (validUser == null) {
      const newUser = await this.userCreate(req, data)
      if (newUser == null) {
        console.error('AuthService - userFindOrCreate - error creating new user')
        return null
      }
      validUser = newUser
    }

    // add IdP data to user
    await this.usersService.updateUserProfile(data.idpData, validUser.user.id)

    // [org] validate that org's account and actual account are the same
    if (accountWithOrg != null && accountWithOrg.id !== validUser.account.id) {
      console.error('AuthService - userFindOrCreate - org required, invalid account id')
      return null
    }

    // prepare to validate credentials
    let expectedSubject = validUser.credential.getProviderData(provider).sub

    // autoconnect social if it wasn't connected AND email is verified
    if (expectedSubject == null && validUser.user?.emailConfirmed === true && data.email_verified === true) {
      validUser.credential.setProviderData(provider, data.subject, data.extra)
      const { id, ...cred } = validUser.credential
      await this.userCredentialsService.updateOne(id, cred)
      console.log('AuthService - userFindOrCreate - autoconnect social')
      expectedSubject = data.subject
    }

    // validate credentials
    // for social logins we validate that the subject (user id in the social) is the expected one
    if (data.subject !== expectedSubject) {
      console.error('AuthService - userFindOrCreate - invalid subject')
      return null
    }

    // store/update oauth tokens
    (validUser.credential as UserCredentialsEntity).setProviderTokens(data.provider, data.tokens)
    const { id, ...cred } = validUser.credential
    await this.userCredentialsService.updateOne(id, cred)

    // gather additional info: account, subscription, ...
    const requestUser = await this.getTokenPayloadFromUserModel(validUser)
    if (requestUser == null) {
      console.error('AuthService - userFindOrCreate - error while creating token')
    }

    return requestUser
  }

  async authGoogle (req, profile, accessToken, refreshToken): Promise<RequestUser | null> {
    /*
      profile = {
        iss: 'accounts.google.com',
        azp: '627822000951-53a8ms2qfooaah8gnree5p1a8smsou36.apps.googleusercontent.com',
        aud: '627822000951-53a8ms2qfooaah8gnree5p1a8smsou36.apps.googleusercontent.com',
        sub: '113712275836931755074',
        email: 'emanuele.cesena@gmail.com',
        email_verified: true,
        at_hash: 'nPTrt2UohVAGAPxzNsIZ-A',
        name: 'Emanuele Cesena',
        picture: 'https://lh3.googleusercontent.com/a-/AOh14GjUMOcLy8nS3ztxcrB0RfD430Frlgu00QNPbyV8Kw=s96-c',
        given_name: 'Emanuele',
        family_name: 'Cesena',
        locale: 'en',
        iat: 1622282004,
        exp: 1622285604,
        jti: '8fd2715a4320b7f8680c4c1390d905ef5b61a099'
      }
    */
    const data = profile ?? {}
    const idpData = {
      email: data.email ?? null,
      name: data.name ?? null,
      given_name: data.given_name ?? null,
      family_name: data.family_mane ?? null,
      picture: data.picture ?? null
    }

    return await this.userFindOrCreate(req, {
      provider: 'google',
      email: data.email,
      email_verified: data.email_verified,
      subject: data.sub,
      extra: data,
      idpData,
      tokens: { access_token: accessToken, refresh_token: refreshToken }
    })
  }

  async authAzureAd (req, profile, accessToken, refreshToken): Promise<RequestUser | null> {
    /*
      profile = {
        sub: 'N8_aXBiWPKx74LKf2z28LbG14UEuRyOX1t8IkVMVVKA',
        oid: 'bffd1826-68f1-4f5c-9966-8b4283512054',
        upn: undefined,
        displayName: 'ec@saasform.dev Cesena',
        name: {
          familyName: undefined,
          givenName: undefined,
          middleName: undefined
        },
        emails: undefined,
        _raw: '{"aud":"becd9aa0-431b-4140-a0b5-d05952426ebc","iss":"https://login.microsoftonline.com/13f01d05-aaf9-49d8-94ce-32ee372992e7/v2.0","iat":1622108856,"nbf":1622108856,"exp":1622112756,"aio":"AWQAm/8TAAAAFMbu7nMRi5DHdBhMxDsvuyRl0owAsOcTbh8HPEoaRN1SM4F88/qKz1R1/4ZGtot3b5XAEeSUmPY++SGNly1wzO9ubIADJ9frDc2YdX7KQfFAonCMMmqOwIHXksJJ/zNw","email":"ec@saasform.dev","idp":"https://sts.windows.net/9188040d-6c67-4c5b-b112-36a304b66dad/","name":"ec@saasform.dev Cesena","nonce":"_aAugJ0JmMiHMKNN6C3s-SV2E8-wA7mI","oid":"bffd1826-68f1-4f5c-9966-8b4283512054","preferred_username":"ec@saasform.dev","prov_data":[{"at":true,"prov":"github.com","altsecid":"1491992"}],"rh":"0.AXwABR3wE_mq2EmUzjLuNymS56Cazb4bQ0BBoLXQWVJCbrx8AEw.","sub":"N8_aXBiWPKx74LKf2z28LbG14UEuRyOX1t8IkVMVVKA","tid":"13f01d05-aaf9-49d8-94ce-32ee372992e7","uti":"LaEsxTASU0O0Qs40_CBAAw","ver":"2.0"}',
        _json: {
          aud: 'becd9aa0-431b-4140-a0b5-d05952426ebc',
          iss: 'https://login.microsoftonline.com/13f01d05-aaf9-49d8-94ce-32ee372992e7/v2.0',
          iat: 1622108856,
          nbf: 1622108856,
          exp: 1622112756,
          aio: 'AWQAm/8TAAAAFMbu7nMRi5DHdBhMxDsvuyRl0owAsOcTbh8HPEoaRN1SM4F88/qKz1R1/4ZGtot3b5XAEeSUmPY++SGNly1wzO9ubIADJ9frDc2YdX7KQfFAonCMMmqOwIHXksJJ/zNw',
          email: 'ec@saasform.dev',
          idp: 'https://sts.windows.net/9188040d-6c67-4c5b-b112-36a304b66dad/',
          name: 'ec@saasform.dev Cesena',
          nonce: '_aAugJ0JmMiHMKNN6C3s-SV2E8-wA7mI',
          oid: 'bffd1826-68f1-4f5c-9966-8b4283512054',
          preferred_username: 'ec@saasform.dev',
          prov_data: [ [Object] ],
          rh: '0.AXwABR3wE_mq2EmUzjLuNymS56Cazb4bQ0BBoLXQWVJCbrx8AEw.',
          sub: 'N8_aXBiWPKx74LKf2z28LbG14UEuRyOX1t8IkVMVVKA',
          tid: '13f01d05-aaf9-49d8-94ce-32ee372992e7',
          uti: 'LaEsxTASU0O0Qs40_CBAAw',
          ver: '2.0'
        }
      }
    */
    const data = profile?._json ?? {}
    const idpData = {
      email: profile?._json?.email ?? null,
      name: profile?._json?.name ?? null,
      given_name: profile?.name?.givenName ?? null,
      middle_name: profile?.name?.middleName ?? null,
      family_name: profile?.name?.undefined ?? null,
      picture: '' // todo: find the right value
    }

    return await this.userFindOrCreate(req, {
      provider: 'azure',
      email: data.email,
      email_verified: true, // Azure AD doesn't return it - TODO: validate that it's always true
      subject: data.sub,
      extra: data,
      idpData,
      tokens: { access_token: accessToken, refresh_token: refreshToken }
    })
  }

  async authMiracl (req, profile, accessToken, refreshToken): Promise<RequestUser | null> {
    /*
      profile = {
        id: 'ec@saasform.dev',
        displayName: undefined,
        name: {
          familyName: undefined,
          givenName: undefined,
          middleName: undefined
        },
        _raw: '{"sub":"ec@saasform.dev","email":"ec@saasform.dev","email_verified":true}',
        _json: {
          sub: 'ec@saasform.dev',
          email: 'ec@saasform.dev',
          email_verified: true
        }
      }
    */
    const data = profile?._json ?? {}
    const { _raw, ...extra } = profile

    return await this.userFindOrCreate(req, {
      provider: 'miracl',
      email: data.email,
      email_verified: data.email_verified ?? false,
      subject: profile.id,
      extra,
      tokens: { access_token: accessToken, refresh_token: refreshToken }
    })
  }

  async authOkta (req, profile, accessToken, refreshToken): Promise<RequestUser | null> {
    /*
      profile = {
        id: '00uc4l9dEVFyEGY9F695',
        displayName: 'Emanuele Due',
        name: { familyName: 'Due', givenName: 'Emanuele', middleName: undefined },
        _raw: '{"sub":"00uc4l9dEVFyEGY9F695","name":"Emanuele Due","locale":"en-US","email":"ec@saasform.dev","preferred_username":"ec@saasform.dev","given_name":"Emanuele","family_name":"Due","zoneinfo":"America/Los_Angeles","updated_at":1626335424,"email_verified":true}',
        _json: {
          sub: '00uc4l9dEVFyEGY9F695',
          name: 'Emanuele Due',
          locale: 'en-US',
          email: 'ec@saasform.dev',
          preferred_username: 'ec@saasform.dev',
          given_name: 'Emanuele',
          family_name: 'Due',
          zoneinfo: 'America/Los_Angeles',
          updated_at: 1626335424,
          email_verified: true
        }
    */
    const data = profile?._json ?? {}
    const { _raw, ...extra } = profile

    return await this.userFindOrCreate(req, {
      provider: 'okta',
      email: data.email,
      email_verified: data.email_verified ?? false,
      subject: profile.id,
      extra,
      tokens: { access_token: accessToken, refresh_token: refreshToken }
    })
  }
}
