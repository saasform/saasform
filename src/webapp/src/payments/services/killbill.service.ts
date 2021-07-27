import { Injectable } from '@nestjs/common'
// import { settings } from 'cluster';
import { ConfigService } from '@nestjs/config'
import { SettingsService } from '../../settings/settings.service'

import { BasePaymentProcessorService } from '../../utilities/basePaymentProcessor.service'

@Injectable()
export class KillBillService extends BasePaymentProcessorService {
  private readonly url: string
  private readonly api_key: string
  private readonly api_secret: string
  private readonly username: string
  private readonly password: string
  public accountApi
  public catalogApi
  public subscriptionApi

  constructor (
    protected readonly configService: ConfigService,
    protected readonly settingsService: SettingsService
  ) {
    super(configService, settingsService)

    this.url = this.configService.get<string>('KILLBILL_URL') ?? ''
    this.api_key = this.configService.get<string>('KILLBILL_API_KEY') ?? ''
    this.api_secret = this.configService.get<string>('KILLBILL_API_SECRET') ?? ''
    this.username = this.configService.get<string>('KILLBILL_USERNAME') ?? ''
    this.password = this.configService.get<string>('KILLBILL_PASSWORD') ?? ''

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

  async attachPaymentMethod (kbAccount: any, method: any): Promise<any> {
    try {
      const pm = { isDefault: true, pluginName: 'killbill-stripe', pluginInfo: { externalPaymentMethodId: method.id } }
      const attachedMethod = await this.accountApi.createPaymentMethod(pm, kbAccount.accountId, 'saasform')
      return { customer: kbAccount, method: attachedMethod }
    } catch (error) {
      console.error('paymentService - attachPaymentMethodInKillBill - error while syncing Stripe payment methods', kbAccount, error)
      return { customer: kbAccount, method: null }
    }
  }

  async createSubscription (customer, plan): Promise<any> {
    try {
      // const trialDays = 10 // TODO
      const subscriptionData = { accountId: customer, planName: `${String(plan.id)}-yearly` }
      const subscription = await this.subscriptionApi.createSubscription(subscriptionData, 'saasform')

      return subscription.data
    } catch (error) {
      console.error('paymentService - createKillBillFreeSubscription - error while creating free plan', plan, customer, error)
      return null
    }
  }

  async createCustomer (customer): Promise<any> {
    try {
      const account = { name: customer.name, externalKey: customer.id, currency: 'USD' }
      const kbCustomer = await this.accountApi.createAccount(account, 'saasform')

      if (kbCustomer == null) {
        console.error('paymentService - createKillBillCustomer - error while creating Kill Bill customer', customer)
      }

      return kbCustomer.data
    } catch (error) {
      console.error('paymentService - createKillBillCustomer - error while creating Kill Bill customer', customer, error)
    }
  }
}
