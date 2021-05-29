import { OIDCStrategy } from 'passport-azure-ad'
import { PassportStrategy } from '@nestjs/passport'
import { ContextIdFactory, ModuleRef } from '@nestjs/core'

import { Injectable } from '@nestjs/common'
import { AuthService } from './auth.service'
import { SettingsService } from '../settings/settings.service'
import { RequestUser } from './interfaces/user.interface'

const OAUTH_AZURE_AD_TENANT_ID = 'x'
const OAUTH_AZURE_AD_CLIENT_ID = 'y'
const OAUTH_AZURE_AD_CLIENT_SECRET_VALUE = 'z'

async function getOptionsFromReq (request: Request, done): Promise<any> {
  const contextId = ContextIdFactory.getByRequest(request)
  const settingsService = await this.moduleRef.resolve(SettingsService, contextId)
  const options = await settingsService.getAzureAdStrategyConfig()
  return options
}

@Injectable()
export class AzureAdStrategy extends PassportStrategy(OIDCStrategy) {
  constructor (private readonly moduleRef: ModuleRef) {
    // Authorization code flow
    // https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow
    super({
      optionsFromRequest: getOptionsFromReq, // important!
      // configurable
      tenantIdOrName: OAUTH_AZURE_AD_TENANT_ID,
      clientID: OAUTH_AZURE_AD_CLIENT_ID,
      clientSecret: OAUTH_AZURE_AD_CLIENT_SECRET_VALUE,
      redirectUrl: 'https://.../auth/azure/callback',
      allowHttpForRedirectUrl: (process.env.NODE_ENV === 'development'),
      scope: 'email profile openid',
      // fixed
      identityMetadata: 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration',
      // responseType
      // 'code' = authorization code flow
      // 'code id_token' = hybrid flow (extract profile data from id_token)
      responseType: 'code',
      responseMode: 'form_post',
      passReqToCallback: true,
      verifyArity: 8
      // loggingLevel: 'info',
      // loggingNoPII: false,
    })
  }

  async validate (
    req, iss, sub, profile, jwtClaims, accessToken, refreshToken, params
  ): Promise<RequestUser | null> {
    const contextId = ContextIdFactory.getByRequest(req)
    const authService = await this.moduleRef.resolve(AuthService, contextId)

    const requestUser = await authService.authAzureAd(req, profile, accessToken, refreshToken)
    return requestUser
  }
}
