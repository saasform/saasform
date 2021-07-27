import { REQUEST } from '@nestjs/core'
import { Injectable, Scope, Inject, NotImplementedException } from '@nestjs/common'
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
import { PlansService } from './plans.service'

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
    private readonly killBillService: KillBillService,
    private readonly plansService: PlansService
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

  /**
   * Enroll or update the payment part of an account.
   * The payment part contains all the data necessary to handle the subscription of an account
   * If the account doesn't have a payment already, it is created.
   * If the account alreay has a payment, it is updated.
   *
   * In details it:
   * 1. Add the plan to the payment
   * 2. Create a customer on the payment provider
   * 3. Add the payment method
   * 4. Add or update the subscription
   * @param account An object containing the account to enroll
   * @param planHandle A string indicating which plan to subscribe (e.g. m-pro may stand for monthly, pro)
   * @param paymentMethod An object containing the payment method to add
   * @returns The payment object
   */
  async enrollOrUpdateAccount (account: AccountEntity, planHandle: string, paymentMethod: any): Promise<any> {
    const config = await this.getPaymentsConfig()
    const provider = config.payment_processor_enabled === true ? config.payment_processor : null

    const payment = account?.data?.payment ?? {
      provider
    }

    if (payment.provider !== config.payment_processor && payment.provider != null) {
      // If provider doesn't match, throw 501
      // If payment provider is null, it is possible to use the new payment provider
      // (e.g. an account was created when there was no provider and then a provider is
      // added; in this case we allow to overwrite the provide and enroll again)
      throw new NotImplementedException('Payment provider mismatch')
    }

    // 1. Add plan
    if (payment.plan == null) {
      // We do not allow to update the plan here.
      // TODO: update plan
      payment.plan = await this.plansService.getPlanFromHandle(planHandle)
    }

    // 2. Create customer
    if (payment.customer == null) {
      payment.customer = await this.paymentProcessor.createCustomer(account.getPaymentProviderCustomer())
    }

    // 3. Add payment method
    if (paymentMethod != null) {
      const { customer, method } = await this.paymentProcessor.attachPaymentMethod(payment.customer, paymentMethod)
      if (method != null) {
        if (payment.methods == null) { payment.methods = [method] } else { payment.methods.push(method) }
      }
      if (customer != null) {
        payment.customer = customer
      }
    }

    // 4. Add or update subscription
    // Considered cases:
    // - disabled: do nothing
    // - enterprise: create "external" subscription, no payment processor
    // - free tier: create "free" subscription, no payment processor
    // - free trial: create "trial" subscription, with payment processor
    // - full subscription: do nothing if no payment method, else create subscription with payment processor
    // Considered inputs:
    // - payment.provider == null -> disabled
    // - plan -> enterprise/free tier/free trial
    // - payment.methods != null -> decide whether create or not full subscription
    if (payment.sub == null && payment.provider != null) {
      if (payment.plan.provider === 'external') { // Enterprise
        payment.sub = { status: 'external' }
      } else if (payment.plan.price === 0) { // Free tier
        payment.sub = { status: 'active' }
      } else if (payment.plan.freeTrial > 0) { // Free trial
        payment.sub = await this.paymentProcessor.createSubscription(payment.customer, payment.plan)
      } else if (payment.methods != null) { // full subscription
        payment.sub = await this.paymentProcessor.createSubscription(payment.customer, payment.plan)
      }
      // else, payment.subscription = null
      // This happens when a subscription is required, no free trial nor free tier is granted and the account is being created:
      // - the payment method was not required yet
      // - the account is created with an empty subscription
      // - later the payment method will be collected and the full subscription will be created (last branch of if)
    }

    return payment
  }

  // OLD

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

  async createSubscription (customer, plan): Promise<any> { // TODO: return a proper type
    if (this.paymentIntegration === 'killbill') {
      return await this.killBillService.createSubscription(customer, plan)
    } else {
      return await this.stripeService.createSubscription(customer, plan)
    }
  }

  /**
   * Attach a payment method to a customer and sets as default.
   * @param account of the user
   * @param method id of the payment method
   */
  async attachPaymentMethod (account: AccountEntity, method: any): Promise<any|null> {
    const response = await this.stripeService.attachPaymentMethod(account.data.stripe, method)

    if (this.paymentIntegration === 'killbill') {
      await this.killBillService.attachPaymentMethod(account.data.killbill, method)
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
