import { Injectable } from '@nestjs/common'
import { UsersService } from '../accounts/services/users.service'
import { AccountsService } from '../accounts/services/accounts.service'
import { RequestUser, ValidUser } from './interfaces/user.interface'

import { JwtService } from '@nestjs/jwt'
import { parseDomain, ParseResultType } from 'parse-domain'

import { UserCredentialsService } from '../accounts/services/userCredentials.service'
import { UserEntity } from '../accounts/entities/user.entity'
import { SettingsService } from '../settings/settings.service'

@Injectable()
export class AuthService {
  constructor (
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly accountsService: AccountsService,
    private readonly userCredentialsService: UserCredentialsService,
    private readonly settingsService: SettingsService
  ) {}

  async validateUser (email: string, inputPassword: string): Promise<ValidUser | null> {
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

    return { user, credential, account }
  }

  async getTokenPayloadFromUserModel (validUser: ValidUser): Promise<RequestUser | null> {
    return {
      nonce: '', // TODO
      id: validUser.user.id,
      account_id: validUser.account?.id,
      account_name: validUser.account?.data.name ?? '',
      status: 'active', // TODO: use actual value
      email: validUser.user.email,
      email_verified: validUser.user?.data.emailConfirmed ?? false,
      staff: validUser.user?.isAdmin ?? false
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

  async setJwtCookie (request, response, requestUser: RequestUser): Promise<any> { // TODO: specify type
    const jwt = await this.jwtService.sign(requestUser)
    const settings = await this.settingsService.getWebsiteSettings()
    const cookieDomain = this.getJwtCookieDomain(request.hostname, settings.domain_primary)

    let options = { secure: true, httpOnly: true, domain: cookieDomain }

    if (process.env.NODE_ENV === 'development') { // TODO: better check for development mode
      options = { secure: false, httpOnly: false, domain: cookieDomain }
    }

    response.cookie('__session', jwt, options) // TODO: make cookie name parametric
  }

  async getUserIdentity (email: string): Promise<UserEntity | null> {
    const user = await this.usersService.findByEmail(email)
    return email != null ? user : null
  }

  async registerUser (email: string, password: string = '', accountEmail: string = ''): Promise<ValidUser | null> {
    if (email == null) {
      console.error('auth.service - registerUser - missing parameters', email, accountEmail)
      return null
    }

    const credential = await this.userCredentialsService.findUserCredentials(email)
    if (credential != null) {
      // if user already present return immediately
      console.error('auth.service - registerUser - user already registered', email, accountEmail)
      return null
    }

    const user = await this.usersService.addUser({ email, password, data: { name: '', email } })
    if (user == null) {
      console.error('auth.service - registerUser - error while creating user', email, accountEmail)
      return null
    }

    const account = await this.accountsService.add({ data: { name: accountEmail ?? email }, user })
    if (account == null) {
      console.error('auth.service - registerUser - error while creating account', email, accountEmail)
      return null
    }

    return { user, credential, account }
  }
}
