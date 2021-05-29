import { ExtractJwt, Strategy } from 'passport-jwt'
import { PassportStrategy } from '@nestjs/passport'
import { Injectable } from '@nestjs/common'
import { ContextIdFactory, ModuleRef } from '@nestjs/core'
import { RequestUser } from './interfaces/user.interface'
import { AuthService } from './auth.service'
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

  async validate (request: Request, payload: any): Promise<RequestUser | null> {
    const contextId = ContextIdFactory.getByRequest(request)
    const authService = await this.moduleRef.resolve(AuthService, contextId)

    const validUser = await authService.getUserInfo(payload.email)

    if (validUser == null) {
      console.error('jwtStrategy - cannot get a valid user')
      return null
    }

    // update jwt here
    // if payload is not up to date wrt models, issue a new jwt
    // this happens if anything changes after login, like a plan change
    const requestUser = await authService.getTokenPayloadFromUserModel(validUser)
    if (requestUser == null) {
      console.error('localStrategy - validate - error while creating token')
    }

    return requestUser
  }
}
