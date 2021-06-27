import { Strategy } from 'passport-oauth2-oidc'
import { PassportStrategy } from '@nestjs/passport'
import { ContextIdFactory, ModuleRef } from '@nestjs/core'

import { Injectable } from '@nestjs/common'
import { AuthService } from './auth.service'
import { SettingsService } from '../settings/settings.service'
import { RequestUser } from './interfaces/user.interface'

async function getOptionsFromReq (request: Request, done): Promise<any> {
  const contextId = ContextIdFactory.getByRequest(request)
  const settingsService = await this.moduleRef.resolve(SettingsService, contextId)
  const options = await settingsService.getMiraclStrategyConfig()
  return options
}

@Injectable()
export class MiraclStrategy extends PassportStrategy(Strategy, 'miracl') {
  constructor (private readonly moduleRef: ModuleRef) {
    super({
      passReqToCallback: true,
      verifyArity: 9,

      issuer: 'https://api.mpin.io',
      authorizationURL: 'https://api.mpin.io/authorize',
      tokenURL: 'https://api.mpin.io/oidc/token',
      userInfoURL: 'https://api.mpin.io/oidc/userinfo',

      scope: 'openid profile email email_verified',
      getOptionsFromReq,
      clientID: '...',
      clientSecret: '...'
      // callbackURL: '/auth/miracl/callback',
    })
  }

  async validate (
    req, iss, sub, profile, jwtClaims, accessToken, refreshToken, params
  ): Promise<RequestUser | null> {
    const contextId = ContextIdFactory.getByRequest(req)
    const authService = await this.moduleRef.resolve(AuthService, contextId)

    const requestUser = await authService.authMiracl(req, profile, accessToken, refreshToken)
    return requestUser
  }
}
