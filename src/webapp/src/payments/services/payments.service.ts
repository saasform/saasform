import { REQUEST } from '@nestjs/core'
import { Injectable, Scope, Inject } from '@nestjs/common'
import { QueryService } from '@nestjs-query/core'

import { BaseService } from '../../utilities/base.service'
// PaymentStatus is giving issues. Check on PaymentEntity
import { PaymentEntity /* PaymentStatus */ } from '../entities/payment.entity'
// TODO: move stripe functions inside this module
import { AccountEntity } from '../../accounts/entities/account.entity'
import { StripeService } from './stripe.service'
import { KillBillService } from './killbill.service'
import { ConfigService } from '@nestjs/config'
import { ValidationService } from '../../validator/validation.service'
import { SettingsService } from '../../settings/settings.service'

@QueryService(PaymentEntity)
@Injectable({ scope: Scope.REQUEST })
export class PaymentsService extends BaseService<PaymentEntity> {
  private readonly paymentIntegration: string
  public readonly paymentProcessor: any

  constructor (
    @Inject(REQUEST) private readonly req,
    private readonly configService: ConfigService,
    private readonly validationService: ValidationService,
    private readonly settingsService: SettingsService,
    private readonly stripeService: StripeService,
    private readonly killBillService: KillBillService
  ) {
    super(
      req,
      'PaymentEntity'
    )
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
      signup_force_payment: settings.signup_force_payment
    }
  }

  /**
   * Retuns the active subscription for an account.
   * @param accountId
   */
  async getActivePayments (accountId: number): Promise<PaymentEntity|null> {
    try {
      const payments = await this.query({
        filter: {
          account_id: { eq: accountId }
        }
      })
      return payments[0] ?? null
    } catch (error) {
      console.error(
        'getActivePayments - error in query',
        accountId,
        error
      )
      return null
    }
  }

  /**
   * Retuns the expiring subscription.
   * @param days number of days that the subscription must be ending in
   */
  async getExpiringPayments (days: number = 5): Promise<PaymentEntity[]|null> {
    const today = Math.floor(Date.now() / 1000)
    const after = today - days * 3600 * 24 // Sun Mar 28 2021
    const before = today - (days - 1) * 3600 * 24 // Mon Mar 29 2021

    try {
      const payments = await this.query({
        filter: {
          status: { in: ['active', 'trialing'] }
        }
      })
      return payments.filter(p => before > p.data.trial_end && p.data.trial_end >= after) ?? null
    } catch (error) {
      console.error(
        'PaymentsService - getExpiringPayments - error in query',
        error
      )
      return null
    }
  }

  /**
   * Fetches the latest status of payments from Stripe.
   * Note, for the moment this is bind to Stripe, but eventually
   * we should generalize this and support other payment processors.
   *
   * In the function we use `for(let i ...)` in place of map or forEach
   * to make the function synchronous; we must wait for all the updates
   * to the DB to finish before moving on because otherwise subscriptions
   * might be not refreshed in time.
   *
   * In the future this function should be deprecated in favor of
   * webhooks called by the payment processor during the subscription
   * lifecycle.
   * @param account the account to refresh.
   */
  async refreshPaymentsFromStripe (account: AccountEntity): Promise<any> { // TODO: return a proper type
    if (account?.data?.stripe == null) return null

    try {
      const customer = await this.stripeService.getSubscriptions(account?.data?.stripe.id)

      const payments = await this.query({
        filter: { account_id: { eq: account.id } }
      })
      const activeSubscriptions = customer.subscriptions.data.map(
        s => s.id
      )
      const paymentsIds = payments.map(p => p.stripe_id)

      // Delete removed payments
      for (let i = 0; i < payments.length; i++) {
        const p = payments[i]
        !activeSubscriptions.includes(p.stripe_id) && // eslint-disable-line
              (await this.deleteOne(p.id))
      }

      // Create new payments.
      for (let i = 0; i < customer.subscriptions.data.length; i++) {
        const subscription = customer.subscriptions.data[i]
        !paymentsIds.includes(subscription.id) &&
              (await this.createOne({
                account_id: account.id,
                status: subscription.status,
                stripe_id: subscription.id,
                data: subscription
              }))
      }

      // Update existing payments
      for (let i = 0; i < payments.length; i++) {
        const { id, ...p } = payments[i]
        const match = customer.subscriptions.data.filter(s => s.id === p.stripe_id)[0]
        if (match != null) {
          // We create the update object
          const update = {
            ...p,
            status: match.status,
            data: match
          }
          await this.updateOne(id, update)
        }
      }

      return null
    } catch (error) {
      console.error('refreshPaymentsFromStripe - error', account, error)
      return null
    }
  }

  async subscribeToPlan (customer: string, paymentMethod: any, price: any): Promise<any> { // TODO: return a proper type
    return await this.stripeService.subscribeToPlan(customer, paymentMethod, price)
  }

  async updatePlan (subscriptionId: any, price: any): Promise<any> { // TODO: return a proper type
    return await this.stripeService.updatePlan(subscriptionId, price)
  }

  async createBillingCustomer (customer): Promise<any> { // TODO: return a proper type
    const stripeCustomer = await this.stripeService.createCustomer(customer)

    // Always create the customer in Stripe, even if the Kill Bill integration is enabled. While not strictly needed,
    // this makes the integration with Saasform easier (as the stripe.id is expected in a lot of places).
    if (this.paymentIntegration === 'killbill') {
      const kbCustomer = await this.killBillService.createCustomer(customer)
      return [stripeCustomer, kbCustomer]
    }

    return [stripeCustomer, null]
  }

  async createFreeSubscription (plan, user): Promise<any> { // TODO: return a proper type
    if (this.paymentIntegration === 'killbill') {
      return await this.killBillService.createFreeSubscription(plan, user)
    } else {
      return await this.stripeService.createFreeSubscription(plan, user)
    }
  }

  /**
   * Attach a payment method to a Stripe customer and sets as default.
   * The payment method must already be created before calling this function.
   * @param account of the user
   * @param method id of the payment method
   */
  async attachPaymentMethod (account: AccountEntity, method: string): Promise<any|null> {
    const response = await this.stripeService.attachPaymentMethod(account.data.stripe.id, method)

    if (this.paymentIntegration === 'killbill') {
      await this.killBillService.attachPaymentMethod(account.data.killbill.accountId, method)
    }

    return response
  }

  /**
   * Checks if a stubscription is active.
   * This means that the subscription must be not null, nor empty
   * and must have a valid status
   * @param subscriptionStatus
   * @returns true if subscription is active
   */
  isPaymentActive (payment): Boolean {
    return (
      this.validationService.isNilOrEmpty(payment) === false
        ? ['active', 'trialing'].includes(payment.status)
        : false
    )
  }

  async isPaymentValid (payment): Promise<Boolean> {
    // const settings = await this.settingsService.getWebsiteSettings()
    const isNull = this.validationService.isNilOrEmpty(payment)

    // if subscription is required, check for null
    // TODO - review this
    // if (!settings.subscription_optional && isNull === true) {
    //   return false
    // }

    // If subscription is not required, we allow for null value.
    // this should be an exception for enterprise cases. This settings
    // can be saas-wise or account-wise.
    // TODO: implement this settings as is not yet implemented in none of the two cases.
    if (isNull === true) {
      return true
    }

    // TODO: how do we handle the case where there is a status different from the
    // active ones, but subscription is not required? It should not happend; currently
    // we return false, but we might want to return differently.

    // Otherwise we just return the current status value
    return this.isPaymentActive(payment)
  }
}
