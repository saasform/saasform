import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Stripe from 'stripe'

import { BasePaymentProcessorService } from '../../utilities/basePaymentProcessor.service'
import { SettingsService } from '../../settings/settings.service'

@Injectable()
export class StripeService extends BasePaymentProcessorService {
  public client

  constructor (
    private readonly settingsService: SettingsService,
    private readonly configService: ConfigService
  ) {
    super()
    const apiKey = this.configService.get<string>('STRIPE_API_KEY') ?? 'xxx'
    if (!apiKey.endsWith('xxx')) {
      this.client = new Stripe(apiKey, { apiVersion: '2020-08-27' })
    } else {
      // TODO: mock in a way that doesn't create issues
      this.client = null
    }
  }

  async getStripeAccountKey (): Promise<string> {
    return (await this.settingsService.getKeysSettings()).stripe_account_key
  }

  async createCustomer (customer): Promise<any> {
    try {
      const stripeCustomer = await this.client.customers.create(
        customer, { stripeAccount: await this.getStripeAccountKey() }
      )

      if (stripeCustomer == null) {
        console.error('paymentService - createStripeCustomer - error while creating stripe customer', customer)
        return null
      }

      return stripeCustomer
    } catch (error) {
      console.error('paymentService - createStripeCustomer - error while creating stripe customer', customer, error)
      return null
    }
  }

  async createFreeSubscription (plan, stripeId): Promise<any> {
    const trialDays = await this.settingsService.getTrialLength()
    const trial_end = Math.floor(Date.now() / 1000) + trialDays * 24 * 60 * 60 // eslint-disable-line @typescript-eslint/naming-convention

    try {
      // TODO: fix the price to use
      const subscription = await this.client.subscriptions.create({
        customer: stripeId,
        items: [{ price: plan.prices.year.id }],
        trial_end
      }, { stripeAccount: await this.getStripeAccountKey() })

      return subscription
    } catch (error) {
      console.error('paymentService - createStripeCustomer - error while creating free plan', plan, stripeId, error)
      return null
    }
  }

  async attachPaymentMethod (customer: string, method: string): Promise<any|null> {
    try {
      await this.client.paymentMethods.attach(method, {
        customer
      }, { stripeAccount: await this.getStripeAccountKey() })
    } catch (error) {
      console.error('paymentsService - attachPaymentMethod - error while attaching', error)
      return null
    }

    try {
      // Change the default invoice settings on the customer to the new payment method
      const updatedCustomer = await this.client.customers.update(
        customer,
        {
          invoice_settings: {
            default_payment_method: method
          }
        }, { stripeAccount: await this.getStripeAccountKey() }
      )

      return updatedCustomer
    } catch (error) {
      console.error('paymentsService - attachPaymentMethod - error while setting default payment method')
      return null
    }
  }

  async subscribeToPlan (customer: string, paymentMethod: any, price: any): Promise<any> { // TODO: return a proper type
    try {
      const subscription = await this.client.subscriptions.create({
        customer,
        default_payment_method: paymentMethod.id,
        items: [
          { price: price.id }
        ],
        expand: ['latest_invoice.payment_intent']
      }, { stripeAccount: await this.getStripeAccountKey() })

      if (subscription == null) {
        console.error('paymentService - subscribeToPlan - error while creating subscription')
        return null
      }

      return subscription
    } catch (error) {
      console.error('paymentService - subscribeToPlan - exception while creating subscription', error)
      return null
    }
  }

  async getSubscriptions (accountId: string): Promise<any> {
    try {
      const customer = await this.client.customers.retrieve(
        accountId,
        { expand: ['subscriptions'] },
        { stripeAccount: await this.getStripeAccountKey() }
      )

      if (customer == null) {
        console.error('StripeService - getSubscriptions - customer is null', accountId)
      }

      return customer
    } catch (error) {
      console.error('StripeService - getSubscriptions - error while getting subscription', accountId, error)
      return null
    }
  }

  async updatePlan (subscriptionId: any, price: any): Promise<any> { // TODO: return a proper type
    try {
      const subscription = await this.client.subscriptions.retrieve(subscriptionId, { stripeAccount: await this.getStripeAccountKey() })

      if (subscription == null) {
        console.error('paymentService - updatePlan - error while finding the subscription to update')
        return null
      }

      const updatedSubscription = await this.client.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
        items: [{
          id: subscription.items.data[0].id,
          price: price.id
        }]
      }, { stripeAccount: await this.getStripeAccountKey() })

      if (updatedSubscription == null) {
        console.error('paymentService - updatePlan - error while updating subscription', subscription)
        return null
      }

      return updatedSubscription
    } catch (error) {
      console.error('paymentService - updatePlan - exception while updating subscription', error)
      return null
    }
  }
}
