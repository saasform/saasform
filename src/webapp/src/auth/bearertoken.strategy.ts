import { Strategy } from 'passport-http-bearer'
// import { Strategy } from 'passport-local'

import { PassportStrategy } from '@nestjs/passport'
import { Injectable } from '@nestjs/common'
import { ContextIdFactory, ModuleRef } from '@nestjs/core'
// import { RequestUser } from './interfaces/user.interface'
// import { AuthService } from './auth.service'
import { SettingsService } from '../settings/settings.service'

@Injectable()
export class BearerTokenStrategy extends PassportStrategy(Strategy) {
  constructor (private readonly moduleRef: ModuleRef) {
    super({
      passReqToCallback: true
    })
  }

  async validate (request: Request, token: string): Promise<any> {
    const contextId = ContextIdFactory.getByRequest(request)
    const settingsService = await this.moduleRef.resolve(SettingsService, contextId)
    const secrets = await settingsService.getKeysSettings()

    // Tokens format in the db is:  "tokens": [{"token":"123..."}, {"token":"456..."}]
    const apiToken = secrets.tokens.filter(t => t.token === token)

    return apiToken
  }
}
