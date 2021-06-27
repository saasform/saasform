import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SettingsService } from '../settings/settings.service'

/**
 * Base class for all payment processor services in Saasform.
 */
@Injectable()
export class BasePaymentProcessorService {
  constructor (
    protected readonly configService: ConfigService,
    protected readonly settingsService: SettingsService
  ) {
  }

  // dynamic API key
  async getApiKey (): Promise<string | null> {
    return null
  }

  // dynamic Publishable key
  async getPublishableKey (): Promise<string | null> {
    return null
  }

  // options attached to every client API call, e.g. for Stripe
  async getApiOptions (): Promise<any> {
    return {}
  }

  getHtml (): string {
    return ''
  }

  async createCustomer (customer: any): Promise<any> {
    // console.log('Create customer')
  }

  async createFreeSubscription (plan: any, stripeId: any): Promise<any> {
    // console.log('Create free subscription')
  }

  async attachPaymentMethod (customer: any, method: any): Promise<any|null> {
    // console.log('Create payment method')
  }

  async subscribeToPlan (customer: any, paymentMethod: any, price: any): Promise<any> {
    // console.log('Subscribe to plan')
  }

  async getSubscriptions (accountId: any): Promise<any> {
    // console.log('Get subscriptions')
  }

  async updatePlan (subscriptionId: any, price: any): Promise<any> {
    // console.log('Update plan')
  }
}