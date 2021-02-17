import { Injectable } from '@nestjs/common'
// import { settings } from 'cluster';
import { ConfigService } from '@nestjs/config'

import { SettingsService } from '../../settings/settings.service'

@Injectable()
export class StripeService {
  private readonly api_key: string
  public client

  constructor (
    private readonly settingsService: SettingsService,
    public configService: ConfigService
  ) {
    this.api_key = this.configService.get<string>('STRIPE_API_KEY') ?? ''
    this.client = require('stripe')(this.api_key)
  }
}
