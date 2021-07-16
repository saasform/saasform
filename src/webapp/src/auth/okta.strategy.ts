import { Strategy } from 'passport-oauth2-oidc'
import { PassportStrategy } from '@nestjs/passport'
import { ContextIdFactory, ModuleRef } from '@nestjs/core'

import { Injectable } from '@nestjs/common'
import { AuthService } from './auth.service'
import { SettingsService } from '../settings/settings.service'
import { RequestUser } from './interfaces/user.interface'

async function getOptionsFromReq (req, done): Promise<any> {
  const contextId = ContextIdFactory.getByRequest(req)
  const authService = await this.moduleRef.resolve(AuthService, contextId)
  const settingsService = await this.moduleRef.resolve(SettingsService, contextId)

  const issuer = req.query?.iss ?? null
  if (issuer == null) {
    return {}
  }

  let domain
  try {
    domain = (new URL(issuer)).hostname
  } catch (TypeError) {
    domain = null
    return {}
  }
  if (domain == null) {
    return {}
  }

  const org = await authService.getOrgByDomain(domain)
  if (org == null) {
    return {}
  }

  const baseUrl: string = await settingsService.getBaseUrl()
  const orgDomain: string = `https://${org.domain as string}` // this should be the same as issuer, but forces https and prevents injections

  return {
    passReqToCallback: true,
    verifyArity: 9,

    issuer: orgDomain,
    authorizationURL: `${orgDomain}/oauth2/v1/authorize`,
    tokenURL: `${orgDomain}/oauth2/v1/token`,
    userInfoURL: `${orgDomain}/oauth2/v1/userinfo`,

    scope: 'openid profile email phone groups',
    clientID: org.client_id,
    clientSecret: org.client_secret,
    callbackURL: `${baseUrl}/auth/okta/callback`
  }
}

@Injectable()
export class OktaStrategy extends PassportStrategy(Strategy, 'okta') {
  constructor (private readonly moduleRef: ModuleRef) {
    super({
      passReqToCallback: true,
      verifyArity: 9,
      getOptionsFromReq,

      issuer: 'https://theneeds.okta.com',
      authorizationURL: 'https://theneeds.okta.com/oauth2/v1/authorize',
      tokenURL: 'https://theneeds.okta.com/oauth2/v1/token',
      userInfoURL: 'https://theneeds.okta.com/oauth2/v1/userinfo',

      scope: 'openid profile email phone groups',
      clientID: '...',
      clientSecret: '...'
      // callbackURL: '/auth/okta/callback',
    })
  }

  async validate (
    req, iss, sub, profile, jwtClaims, accessToken, refreshToken, params
  ): Promise<RequestUser | null> {
    const contextId = ContextIdFactory.getByRequest(req)
    const authService = await this.moduleRef.resolve(AuthService, contextId)

    const requestUser = await authService.authOkta(req, profile, accessToken, refreshToken)
    return requestUser
  }
}
