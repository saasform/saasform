import { ExtractJwt, Strategy } from 'passport-jwt'
import { PassportStrategy } from '@nestjs/passport'
import { Injectable } from '@nestjs/common'
import { ContextIdFactory, ModuleRef } from '@nestjs/core'
import { RequestUser } from './interfaces/user.interface'
import { SettingsService } from '../settings/settings.service'

const cookieOrBearerExtractor = (req: any): any => {
  if (req?.cookies?.__session != null) {
    return req.cookies.__session
  }
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req)
}

async function secretOrKeyProvider (request: Request, rawJwtToken, done): Promise<any> {
  const contextId = ContextIdFactory.getByRequest(request)
  const settingsService = await this.moduleRef.resolve(SettingsService, contextId)
  const secret = await settingsService.getJWTPublicKey()

  return done(null, secret)
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor (private readonly moduleRef: ModuleRef) {
    super({
      jwtFromRequest: cookieOrBearerExtractor,
      ignoreExpiration: false,
      algorithms: ['ES256'],
      secretOrKeyProvider: secretOrKeyProvider,
      passReqToCallback: true
    })
  }

  async validate (request: Request, payload: any): Promise<RequestUser> {
    // Validate subscriptions here
    // TODO if payload is not up to date wrt models, issue a new jwt
    // this happens if anything changes after login, like a plan change
    return payload
  }
}
