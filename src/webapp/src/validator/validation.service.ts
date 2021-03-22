import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import validator from 'validator'

import { SettingsService } from '../settings/settings.service'

@Injectable()
export class ValidationService {
  constructor (
    private readonly settingsService: SettingsService,
    public configService: ConfigService
  ) { }

  isNilOrEmpty (element): Boolean {
    if (element === null) {
      return true
    }
    if (element === undefined) {
      return true
    }
    if (typeof element === 'string' && validator.isEmpty(element)) {
      return true
    }

    return false
  }
}
