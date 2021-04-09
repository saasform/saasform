import { Injectable } from '@nestjs/common'
import { UsersService } from '../accounts/services/users.service'
import { AccountsService } from '../accounts/services/accounts.service'
import { RequestUser, ValidUser } from './interfaces/user.interface'

import { JwtService } from '@nestjs/jwt'
import { parseDomain, ParseResultType } from 'parse-domain'

import { UserCredentialsService } from '../accounts/services/userCredentials.service'
import { UserEntity } from '../accounts/entities/user.entity'
import { SettingsService } from '../settings/settings.service'
import { PaymentsService } from '../payments/services/payments.service'
import { PlansService } from '../payments/services/plans.service'
import { UserError } from '../utilities/common.model'
import { CredentialType, UserCredentialsEntity } from '../accounts/entities/userCredentials.entity'

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

  async validateUser (email: string, inputPassword: string): Promise<ValidUser | null> {
    if (email == null || inputPassword == null) {
      return null
    }

    const validUser = await this.getUserInfo(email)
    if (validUser == null) {
      console.error('auth.service - validateUser - cannon get valid user info', email)
      return null
    }

    const isRegistered = await this.userCredentialsService.isRegistered(validUser.credential, inputPassword)
    if (!isRegistered) {
      console.error('auth.service - validateUser - credentials not registered', email)
      return null
    }

    return validUser
  }

  async getTokenPayloadFromUserModel (validUser: ValidUser): Promise<RequestUser | null> {
    const { allowedKeys } = await this.settingsService.getUserSettings()
    const userData = validUser.user.data.profile != null
      ? allowedKeys.reduce((acc, key: string) => {
        acc[`user_${key}`] = validUser.user.data.profile[key] ?? '' // using user_${key} to flatten the jwt data
        return acc
      }, {})
      : {}
    return {
      nonce: '', // TODO
      id: validUser.user.id,
      account_id: validUser.account?.id,
      account_name: validUser.account?.data.name ?? '',
      status: 'active', // TODO: use actual value
      email: validUser.user.email,
      email_verified: validUser.user?.data.emailConfirmed ?? false,
      staff: validUser.user?.isAdmin ?? false,
      username: validUser.user.username ?? '',
      ...userData
    }
  }

  async updateActiveSubscription (token: RequestUser): Promise<RequestUser | null> {
    // Remove the subscription details. This is necessary because otherwise
    // we would keep old data if subscription changed.
    const { subscription_id, subscription_plan, subscription_status, ...tokenWithOutSubscription } = token // eslint-disable-line

    if (token.account_id == null) {
      // This should never happend
      console.error('AuthService - updateActiveSubscription - No account available')
      return tokenWithOutSubscription
    }

    // TODO: next lines should be removed when we have web hooks from stripe
    const account = await this.accountsService.getById(token.account_id)
    await this.paymentsService.refreshPaymentsFromStripe(account)

    const payment = await this.paymentsService.getActivePayments(token.account_id)

    if (payment == null) {
      // No subscription. Returning the token without subscription details
      console.error('AuthService - updateActiveSubscription - No subscription available')
      return tokenWithOutSubscription
    }

    const plan = await this.plansService.getPlanForPayment(payment)

    if (plan == null) {
      // this should never happend. TODO: check if this is valid when plans change
      console.error('AuthService - updateActiveSubscription - No plan for subscription')
      return null
    }

    return {
      ...tokenWithOutSubscription,
      subscription_id: payment.data.id,
      subscription_plan: plan.uid,
      subscription_status: payment.status,
      subscription_expiration: payment.data.current_period_end
    }
  }

  getJwtCookieDomain (requestHostname: string, primaryDomain: string): any { // TODO: specify type
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

  async setJwtCookie (request, response, requestUser: RequestUser): Promise<any> { // TODO: specify type
    const jwt = await this.jwtService.sign(requestUser)
    const options = await this.getJwtCookieOptions(request)

    response.cookie('__session', jwt, options) // TODO: make cookie name parametric
  }

  async getUserIdentity (email: string): Promise<UserEntity | null> {
    const user = await this.usersService.findByEmail(email)
    return email != null ? user : null
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

  async registerUser (userData: any): Promise<ValidUser | UserError | null> {
    const newUser = await this.createNewUser(userData)
    if (newUser instanceof UserError || newUser == null) {
      console.error('auth.service - registerUser - error while creating user')
      return newUser
    }

    const { user, credential } = newUser
    const { email, accountEmail } = userData
    // We create a new acount for this user and add this as owner
    const account = await this.accountsService.add({ data: { name: accountEmail ?? email }, user })
    if (account == null) {
      console.error('auth.service - registerUser - error while creating account', email, accountEmail)
      return null
    }

    return { user, credential, account }
  }

  async onGoogleSignin (email: string, subject: string): Promise<ValidUser | null> {
    let user: UserEntity | null
    let credential: UserCredentialsEntity | null

    if (email == null || subject == null) {
      console.error('auth.service - onGoogleSignin - error arguments', email, subject)
      return null
    }

    console.log(email, subject)

    // 1. search for a valid credential for the current user
    credential = await this.userCredentialsService.findUserCredentialByEmail(email, `${CredentialType.GOOGLE}:${subject}` as CredentialType)

    if (credential == null) {
      console.log('no user')
      // 2a. We do not already have a user, so we create one
      const userData = {
        email,
        password: ''
      }
      const newUser = await this.registerUser(userData)

      if (newUser instanceof UserError || newUser == null) {
        console.error('auth.service - onGoogleSignin - error while creating user')
        return null
      }

      console.log('created user', newUser)

      user = newUser.user
      credential = newUser.credential

      if (user == null || credential == null) {
        // This should never happen
        console.error('auth.service - onGoogleSignin - user or credential null')
        return null
      }
    } else {
      user = await this.usersService.findUser(credential.userId)
      // 2b. We already have a user, so we fetch it
      if (user == null) {
        console.error('auth.service - onGoogleSignin - userInfo not found', email)
        return null
      }

      // 2b. TODO: check if email is verified
    }

    // 3. Add google id
    await this.userCredentialsService.attachUserCredentials(
      email,
      subject,
      CredentialType.GOOGLE
    )

    // 4. fetch account
    const account = await this.accountsService.findByUserId(user.id)
    if (account == null) {
      console.error('auth.service - onGoogleSignin - account not found', user)
      return null
    }

    return { user, credential, account }
  }

  /*
  private async connectWithGoogle (googleEmail: string, googleSubject: string): Promise<UserEntity | null> {
    const saasformUserCredential = await this.userCredentialsService.findUserCredentialByEmail(googleEmail, CredentialType.DEFAULT)

    if (saasformUserCredential == null) {
      console.error('auth.service - connectWithGoogle - error while connect a user to his google account', saasformUserCredential, googleSubject)
      return null
    }

    const googleCredential = await this.userCredentialsService.attachUserCredentials(
      googleEmail,
      googleSubject,
      CredentialType.GOOGLE
    )

    return await this.usersService.findUser(googleCredential?.userId ?? -1)
  }
  */
}
