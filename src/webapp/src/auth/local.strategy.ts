import { Strategy } from 'passport-local'
import { PassportStrategy } from '@nestjs/passport'
import { ContextIdFactory, ModuleRef } from '@nestjs/core'
import { Injectable } from '@nestjs/common'
import { AuthService } from './auth.service'
import { RequestUser } from './interfaces/user.interface'

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor (private readonly moduleRef: ModuleRef) {
    super({
      passReqToCallback: true,
      usernameField: 'email'
    })
  }

  async validate (
    request: Request,
    email: string,
    password: string
  ): Promise<RequestUser | null> {
    const contextId = ContextIdFactory.getByRequest(request)
    const authService = await this.moduleRef.resolve(AuthService, contextId)

    const user = await authService.validateUser(email, password)
    if (user == null) {
      console.error('local.strategy - validate - invalid email or password', email)
      return null
    }

    const requestUser = await authService.getTokenPayloadFromUserModel(user)
    if (requestUser == null) {
      console.error('localStrategy - validate - error while creating token')
    }

    return requestUser
  }
}
