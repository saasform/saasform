import { Injectable } from '@nestjs/common'
// import { settings } from 'cluster';
import { ConfigService } from '@nestjs/config'

import { SettingsService } from '../../settings/settings.service'

@Injectable()
export class KillBillService {
  private readonly url: string
  private readonly api_key: string
  private readonly api_secret: string
  private readonly username: string
  private readonly password: string
  public accountApi
  public catalogApi
  public subscriptionApi

  constructor (
    private readonly settingsService: SettingsService,
    public configService: ConfigService
  ) {
    this.url = this.configService.get<string>('KB_URL') ?? ''
    this.api_key = this.configService.get<string>('KB_API_KEY') ?? ''
    this.api_secret = this.configService.get<string>('KB_API_SECRET') ?? ''
    this.username = this.configService.get<string>('KB_USERNAME') ?? ''
    this.password = this.configService.get<string>('KB_PASSWORD') ?? ''

    const killbill = require('killbill') // eslint-disable-line
    const globalAxios = require('axios') // eslint-disable-line
    const axios = globalAxios.create()
    axios.interceptors.response.use(killbill.followLocationHeaderInterceptor)

    const config = new killbill.Configuration({
      username: this.username,
      password: this.password,
      apiKey: killbill.apiKey(this.api_key, this.api_secret),
      basePath: this.url
    })
    this.accountApi = new killbill.AccountApi(config, null, axios)
    this.catalogApi = new killbill.CatalogApi(config, null, axios)
    this.subscriptionApi = new killbill.SubscriptionApi(config, null, axios)
  }
}
