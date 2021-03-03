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

  constructor (
    private readonly settingsService: SettingsService,
    public configService: ConfigService
  ) {
    this.url = this.configService.get<string>('KB_URL') ?? 'http://127.0.0.1:8080'
    this.api_key = this.configService.get<string>('KB_API_KEY') ?? 'bob'
    this.api_secret = this.configService.get<string>('KB_API_SECRET') ?? 'lazar'
    this.username = this.configService.get<string>('KB_USERNAME') ?? 'admin'
    this.password = this.configService.get<string>('KB_PASSWORD') ?? 'password'

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
  }
}
