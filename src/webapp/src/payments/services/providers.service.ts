import { REQUEST } from '@nestjs/core'
import { Injectable, Inject } from '@nestjs/common'

import { PlanEntity } from '../entities/plan.entity'

import { StripeService } from './stripe.service'
import { KillBillService } from './killbill.service'
import { ConfigService } from '@nestjs/config'
// import { ValidationService } from '../../validator/validation.service'
import { SettingsService } from '../../settings/settings.service'
// import { PlansService } from './plans.service'

@Injectable()
export class ProvidersService {
  private readonly paymentIntegration: string
  public readonly paymentProcessor: any

  constructor (
    @Inject(REQUEST) private readonly req,
    private readonly configService: ConfigService,
    // private readonly validationService: ValidationService,
    private readonly settingsService: SettingsService,
    private readonly stripeService: StripeService,
    private readonly killBillService: KillBillService
    // private readonly plansService: PlansService
  ) {
    this.paymentIntegration = this.configService.get<string>('MODULE_PAYMENT', 'stripe')
    if (this.paymentIntegration === 'killbill') {
      this.paymentProcessor = this.killBillService
    } else {
      this.paymentProcessor = this.stripeService
    }
  }

  async getPaymentsConfig (): Promise<any> {
    const settings = await this.settingsService.getWebsiteRenderingVariables()
    const processorEnabled = this.stripeService.enabled
    return {
      payment_processor: this.paymentIntegration,
      payment_processor_enabled: processorEnabled,
      signup_force_payment: settings.signup_force_payment === true
    }
  }

  // dynamic API key
  async getApiKey (): Promise<string | null> {
    return this.paymentProcessor.getApiKey()
  }

  // dynamic Publishable key
  async getPublishableKey (): Promise<string | null> {
    return this.paymentProcessor.getPublishableKey()
  }

  // options attached to every client API call, e.g. for Stripe
  async getApiOptions (): Promise<any> {
    return this.paymentProcessor.getApiOptions()
  }

  getHtml (): string {
    return this.paymentProcessor.getHtml()
  }

  async createCustomer (customer: any): Promise<any> {
    return this.paymentProcessor.createCustomer(customer)
  }

  async createSubscription (customer: any, plan: any): Promise<any> {
    return this.paymentProcessor.createSubscription(customer, plan)
  }

  async attachPaymentMethod (customer: any, method: any): Promise<any> {
    return this.paymentProcessor.attachPaymentMethod(customer, method)
  }

  async createPlan (plan: PlanEntity): Promise<any> {
    return this.paymentProcessor.createPlan(plan)
  }
}
