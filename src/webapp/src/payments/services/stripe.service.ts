import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Stripe from 'stripe'

import { SettingsService } from '../../settings/settings.service'

@Injectable()
export class StripeService {
  public client

  constructor (
    private readonly settingsService: SettingsService,
    private readonly configService: ConfigService
  ) {
    const apiKey = this.configService.get<string>('STRIPE_API_KEY') ?? 'xxx'
    if (!apiKey.endsWith('xxx')) {
      this.client = new Stripe(apiKey, { apiVersion: '2020-08-27' })
    } else {
      // TODO: mock in a way that doesn't create issues
      this.client = null
    }
  }
}
