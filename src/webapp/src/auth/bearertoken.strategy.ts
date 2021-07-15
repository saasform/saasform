import { Strategy } from 'passport-http-bearer'
// import { Strategy } from 'passport-local'

import { PassportStrategy } from '@nestjs/passport'
import { Injectable } from '@nestjs/common'
import { /* ContextIdFactory, */ ModuleRef } from '@nestjs/core'
// import { RequestUser } from './interfaces/user.interface'
// import { AuthService } from './auth.service'
// import { SettingsService } from '../settings/settings.service'

@Injectable()
export class BearerTokenStrategy extends PassportStrategy(Strategy) {
  constructor (private readonly moduleRef: ModuleRef) {
    super()
  }

  async validate (token: string): Promise<any> {
    console.log('token', token)
    return { foo: 'bar' }
  }
}
