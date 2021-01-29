import { Injectable } from '@nestjs/common'
import { UsersService } from '../accounts/services/users.service'
import { AccountsService } from '../accounts/services/accounts.service'
// import { SettingsService } from '../settings/settings.service'
import { RequestUser, ValidUser } from './interfaces/user.interface'

import { JwtService } from '@nestjs/jwt'
import { parseDomain, ParseResultType } from 'parse-domain'

// import { PaymentsService } from '../paymentModule/payments.service'
// import { PlansService } from '../plans/plans.service'
import { UserCredentialsService } from '../accounts/services/userCredentials.service'
import config from '../utilities/config'
import { UserEntity } from '../accounts/entities/user.entity'

@Injectable()
export class AuthService {
  constructor (
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly accountsService: AccountsService,
    // private readonly settingsService: SettingsService,
    // private readonly paymentService: PaymentsService,
    // private readonly plansService: PlansService,
    private readonly userCredentialsService: UserCredentialsService
  ) {}

  async validateUser (email: string, inputPassword: string): Promise<ValidUser | null> { // TODO: use a valid type
    if (email == null || inputPassword == null) {
      return null
    }
    const credential = await this.userCredentialsService.findUserCredentials(email)
    if (credential == null) {
      console.error('auth.service - validateUser - credentials not valid', email)
      return null
    }

    const isRegistered = await this.userCredentialsService.isRegistered(credential, inputPassword)
    if (!isRegistered) {
      console.error('auth.service - validateUser - credentials not registered', email)
      return null
    }

    const user = await this.usersService.findById(credential.userId)
    if (user == null) {
      console.error('auth.service - validateUser - userInfo not found', email)
      return null
    }

    const account = await this.accountsService.findByUserId(user.id)
    if (account == null) {
      console.error('auth.service - registerUser - account not found', user)
      return null
    }

    // BILLING
    // const subscription = await this.validateSubscription(account)
    // return { user, credential, account, subscription }

    return { user, credential, account }
  }

  // BILLING
  /**
  * Get info about the plan from the DB.
  * Eventually plans and payments should converge into a single module
  * (or groups of module) and just 1 call should be enough.
  *
  * @param user_id
  */
  /*
  async validateSubscription (account) {
    await this.paymentService.refreshPaymentsFromStripe(account)
    const payment = await this.paymentService.getActivePayments(account.id)
    const plan = await this.plansService.getPlanForPayment(payment)

    const subscription = plan
      ? {
        subscription_id: payment.id,
        subscription_plan: plan.uid,
        subscription_status: payment.status,
        payment_status: null, // TODO
        subscription_expiration: null // TODO
      }
      : {}

    return subscription
  }
  */

  async getTokenPayloadFromUserModel (validUser: ValidUser): Promise<RequestUser | null> {
    return {
      nonce: '', // TODO
      id: validUser.user.id,
      account_id: validUser.account?.id,
      account_name: validUser.account?.data.name ?? '',
      status: 'active',
      email: validUser.user.email,
      email_verified: validUser.user?.data.emailConfirmed ?? false,
      staff: validUser.user?.isAdmin ?? false
      // ...subscription
    }
  }

  getJwtCookieDomain (requestHostname, primaryDomain): any { // TODO: use a valid type
    let cookieDomain

    // if the request is from localhost or mysaasform.com, use the request's hostname
    if (requestHostname.endsWith('.localhost') != null || requestHostname.endsWith('.mysaasform.com') != null) {
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

  async setJwtCookie (request, response, requestUser: RequestUser): Promise<any> { // TODO: use a valid type
    const jwt = await this.jwtService.sign(requestUser)
    const settings = { domain_primary: 'localhost' } /* await this.settingsService.getWebsiteSettings() */
    const cookieDomain = this.getJwtCookieDomain(request.hostname, settings.domain_primary)

    let options = { secure: true, httpOnly: true, domain: cookieDomain }

    if (config.__IS_DEV__) {
      options = { secure: false, httpOnly: false, domain: cookieDomain }
    }

    response.cookie('__session', jwt, options)
  }

  async getUserIdentity (email: string): Promise<UserEntity | null> {
    const user = await this.usersService.findByEmail(email)
    return email != null ? user : null
  }

  async registerUser (email: string, password: string = '', accountEmail: string = ''): Promise<ValidUser | null> {
    if (email == null) {
      console.error('auth.service - registerUser - missing parameters', email, password, accountEmail)
      return null // this should never happen
    }

    const credential = await this.userCredentialsService.findUserCredentials(email)
    if (credential != null) {
      console.error('auth.service - registerUser - user already registered', email, password, accountEmail)
      // if user already present return immediately
      return null
    }

    const user = await this.usersService.addUser({ email, password, data: { name: '', email } })
    if (user == null) {
      console.error('auth.service - registerUser - error while creating user', email, password, accountEmail)
      // if user already present return immediately
      return null
    }

    const account = await this.accountsService.add({ data: { name: accountEmail ?? email }, user })
    if (account == null) {
      console.error('auth.service - registerUser - error while creating account', email, password, accountEmail)
      // if user already present return immediately
      return null
    }
    // BILLING
    // await this.paymentService.refreshPaymentsFromStripe(account)

    return { user, credential, account }
  }
}
