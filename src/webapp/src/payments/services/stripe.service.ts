import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Stripe from 'stripe'

import { BasePaymentProcessorService } from '../../utilities/basePaymentProcessor.service'
import { SettingsService } from '../../settings/settings.service'
import { PlanEntity } from '../entities/plan.entity'

@Injectable()
export class StripeService extends BasePaymentProcessorService {
  public enabled = false
  public client
  public apiOptions
  public publishableKey: string

  constructor (
    protected readonly configService: ConfigService,
    protected readonly settingsService: SettingsService
  ) {
    super(configService, settingsService)
    this.init()  // eslint-disable-line
  }

  async init (): Promise<void> {
    this.apiOptions = await this.getApiOptions()
    this.publishableKey = await this.getPublishableKey() ?? this.configService.get<string>('STRIPE_PUBLISHABLE_KEY') ?? ''
    const apiKey = await this.getApiKey() ?? this.configService.get<string>('STRIPE_API_KEY') ?? 'xxx'
    if (!apiKey.endsWith('xxx')) {
      this.client = new Stripe(apiKey, { apiVersion: '2020-08-27' })
      this.enabled = true
    } else {
      // TODO: mock in a way that doesn't create issues
      this.client = null
    }
  }

  getHtml (): string {
    const jsonApiOptions = JSON.stringify(this.apiOptions)
    const html = this.client != null ? `
<script src="https://js.stripe.com/v3/"></script>
<script>const stripe = Stripe("${this.publishableKey}", ${jsonApiOptions});</script>
` : '<script>console.warn(\'Stripe not initialized - configure STRIPE_API_KEY in saasform.yml\');</script>'
    return html
  }

  async createCustomer (customer): Promise<any> {
    try {
      const stripeCustomer = await this.client.customers.create(
        customer, this.apiOptions
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

  /**
   * Return the Stripe price id given a plan.
   * Consider the year/month interval of the plan to choose the correct price
   * @param plan Saasform plan
   * @returns Stripe price id
   */
  getPriceIdFromPlan (plan): string {
    const interval = plan.interval === 'year' ? 'year' : 'month'
    const prices = plan?.stripe?.prices ?? { }
    return prices[interval]?.id ?? ''
  }

  async createSubscription (customer, plan): Promise<any> {
    const trialDays = plan.freeTrial ?? await this.settingsService.getTrialLength()
    const trialEnd = Math.floor(Date.now() / 1000) + trialDays * 24 * 60 * 60

    const subscriptionOptions: any = {
      customer: customer.id,
      items: [{ price: this.getPriceIdFromPlan(plan) }]
    }
    if (trialDays > 0) {
      subscriptionOptions.trial_end = trialEnd
    }

    try {
      // TODO: fix the price to use
      const subscription = await this.client.subscriptions.create(subscriptionOptions, this.apiOptions)

      return subscription
    } catch (error) {
      console.error('paymentService - createStripeCustomer - error while creating subscription', customer.id, plan, error)
      return null
    }
  }

  /**
   * Attach a payment method to a Stripe customer and sets as default.
   * The payment method must already be created before calling this function.
   * @param account of the user
   * @param method the payment method
   */
  async attachPaymentMethod (customer: any, method: any): Promise<any> {
    let attachedMethod = null
    try {
      attachedMethod = await this.client.paymentMethods.attach(method.id, {
        customer: customer.id
      }, this.apiOptions)
    } catch (error) {
      console.error('paymentsService - attachPaymentMethod - error while attaching payment method', error)
      return { customer: null, method: null }
    }

    try {
      // Change the default invoice settings on the customer to the new payment method
      const updatedCustomer = await this.client.customers.update(
        customer.id,
        {
          invoice_settings: {
            default_payment_method: method.id
          }
        }, this.apiOptions
      )

      return { customer: updatedCustomer, method: attachedMethod }
    } catch (error) {
      console.error('paymentsService - attachPaymentMethod - error while setting default payment method')
      return { customer: null, method: attachedMethod }
    }
  }

  // Duplicate of createSubscription.
  // Deprecated ?
  async subscribeToPlan (customer: string, paymentMethod: any, price: any): Promise<any> { // TODO: return a proper type
    try {
      const subscription = await this.client.subscriptions.create({
        customer,
        default_payment_method: paymentMethod.id,
        items: [
          { price: price.id }
        ],
        expand: ['latest_invoice.payment_intent']
      }, this.apiOptions)

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
        this.apiOptions
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

  // todo: rename to updateSubscription
  async updatePlan (subscriptionId: any, price: any): Promise<any> { // TODO: return a proper type
    try {
      const subscription = await this.client.subscriptions.retrieve(subscriptionId, this.apiOptions)

      if (subscription == null) {
        console.error('paymentService - updatePlan - error while finding the subscription to update')
        return null
      }

      const updatedSubscription = await this.client.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
        items: [{
          id: subscription.items.data[0].id, // subscription item id
          price: price.id // new price id
        }]
      }, this.apiOptions)

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

  async createPlan (plan: PlanEntity): Promise<any> {
    let monthPrice = null
    let yearPrice = null
    let product: any

    try {
      const monthAmount = plan.getIntervalPrice('month')
      const yearAmount = plan.getIntervalPrice('year')
      const name = plan.getName()
      const description = plan.getDescription()

      // TODO: if yearAmount is 0, use standard discount
      product = await this.client.products.create({
        name,
        description
      }, this.apiOptions)

      if (monthAmount != null) {
        monthPrice = await this.client.prices.create({
          unit_amount: monthAmount,
          currency: 'usd',
          recurring: { interval: 'month' },
          product: product.id
        }, this.apiOptions)
      }

      if (yearAmount != null) {
        yearPrice = await this.client.prices.create({
          unit_amount: (yearAmount * 12),
          currency: 'usd',
          recurring: { interval: 'year' },
          product: product.id
        }, this.apiOptions)
      }
    } catch (err) {
      console.error('Error while creating plan', plan, err)
      return null
    }

    const prices = { year: yearPrice, month: monthPrice }

    return { product, prices }
  }
}
