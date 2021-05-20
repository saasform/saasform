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
  }

  /**
   * Retuns the active subscription for an account.
   * @param accountId
   */
  async getActivePayments (accountId: number): Promise<PaymentEntity|null> {
    try {
      const payments = await this.query({
        filter: {
          account_id: { eq: accountId },
          status: { in: ['active', 'trialing'] }
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
      const customer = await this.stripeService.client.customers.retrieve(
        account.data.stripe.id,
        { expand: ['subscriptions'] }
      )

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

  async createPaymentMethod (customer: string, card: any): Promise<any> { // TODO: return a proper type
    // DEPRECATED
    const { number, exp_month, exp_year, cvc } = card // eslint-disable-line
    try {
      const paymentMethod = await this.stripeService.client.paymentMethods.create({
        type: 'card',
        card: {
          number, exp_month, exp_year, cvc
        }
      })

      await this.stripeService.client.paymentMethods.attach(
        paymentMethod.id,
        { customer }
      )

      return paymentMethod
    } catch (error) {
      console.error('paymentsService - createPaymentMethod - error', error)
      return null
    }

    // TODO: check errors

    // TODO: make default.
    /*
  await stripe.customers.update(req.body.customerId, {
    invoice_settings: {
      default_payment_method: req.body.paymentMethodId,
    },
  });
    */
  }

  async subscribeToPlan (customer: string, paymentMethod: any, price: any): Promise<any> { // TODO: return a proper type
    try {
      const subscription = await this.stripeService.client.subscriptions.create({
        customer,
        default_payment_method: paymentMethod.id,
        items: [
          { price: price.id }
        ],
        expand: ['latest_invoice.payment_intent']
      })

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

  async updatePlan (subscriptionId: any, price: any): Promise<any> { // TODO: return a proper type
    try {
      const subscription = await this.stripeService.client.subscriptions.retrieve(subscriptionId)

      if (subscription == null) {
        console.error('paymentService - updatePlan - error while finding the subscription to update')
        return null
      }

      const updatedSubscription = await this.stripeService.client.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
        items: [{
          id: subscription.items.data[0].id,
          price: price.id
        }]
      })

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

  async createBillingCustomer (customer): Promise<any> { // TODO: return a proper type
    const stripeCustomer = await this.createStripeCustomer(customer)

    // Always create the customer in Stripe, even if the Kill Bill integration is enabled. While not strictly needed,
    // this makes the integration with Saasform easier (as the stripe.id is expected in a lot of places).
    if (this.paymentIntegration === 'killbill') {
      const kbCustomer = await this.createKillBillCustomer(customer, stripeCustomer)
      return [stripeCustomer, kbCustomer]
    }

    return [stripeCustomer, null]
  }

  async createKillBillCustomer (customer, stripeCustomer): Promise<any> {
    try {
      const account = { name: customer.name, externalKey: stripeCustomer.id, currency: 'USD' }
      const kbCustomer = await this.killBillService.accountApi.createAccount(account, 'saasform')

      if (kbCustomer == null) {
        console.error('paymentService - createKillBillCustomer - error while creating Kill Bill customer', customer)
      }

      return kbCustomer.data
    } catch (error) {
      console.error('paymentService - createKillBillCustomer - error while creating Kill Bill customer', customer, error)
    }
  }

  async createStripeCustomer (customer): Promise<any> {
    try {
      const stripeCustomer = await this.stripeService.client.customers.create(
        customer
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

  async createFreeSubscription (plan, user): Promise<any> { // TODO: return a proper type
    if (this.paymentIntegration === 'killbill') {
      return await this.createKillBillFreeSubscription(plan, user)
    } else {
      return await this.createStripeFreeSubscription(plan, user)
    }
  }

  async createKillBillFreeSubscription (plan, kbAccountId): Promise<any> {
    try {
      // const trialDays = 10 // TODO
      const subscriptionData = { accountId: kbAccountId, planName: `${String(plan.id)}-yearly` }
      const subscription = await this.killBillService.subscriptionApi.createSubscription(subscriptionData, 'saasform')

      return subscription.data
    } catch (error) {
      console.error('paymentService - createKillBillFreeSubscription - error while creating free plan', plan, kbAccountId, error)
      return null
    }
  }

  async createStripeFreeSubscription (plan, stripeId): Promise<any> {
    // TODO: fix the trial duration
    const trialDays = 10
    const trial_end = Math.floor(Date.now() / 1000) + trialDays * 24 * 60 * 60 // eslint-disable-line @typescript-eslint/naming-convention

    try {
      // TODO: fix the price to use
      const subscription = await this.stripeService.client.subscriptions.create({
        customer: stripeId,
        items: [{ price: plan.prices.year.id }],
        trial_end
      })

      return subscription
    } catch (error) {
      console.error('paymentService - createStripeCustomer - error while creating free plan', plan, stripeId, error)
      return null
    }
  };

  /**
   * Attach a payment method to a Stripe customer and sets as default.
   * The payment method must already be created before calling this function.
   * @param account of the user
   * @param method id of the payment method
   */
  async attachPaymentMethod (account: AccountEntity, method: string): Promise<any|null> {
    const response = await this.attachPaymentMethodInStripe(account.data.stripe.id, method)

    if (this.paymentIntegration === 'killbill') {
      await this.attachPaymentMethodInKillBill(account.data.killbill.accountId, method)
    }

    return response
  }

  async attachPaymentMethodInKillBill (kbAccountId: string, stripePmId: string): Promise<any|null> {
    try {
      const pm = { isDefault: true, pluginName: 'killbill-stripe', pluginInfo: { externalPaymentMethodId: stripePmId } }
      await this.killBillService.accountApi.createPaymentMethod(pm, kbAccountId, 'saasform')
    } catch (error) {
      console.error('paymentService - attachPaymentMethodInKillBill - error while syncing Stripe payment methods', kbAccountId, error)
      return null
    }
  }

  async attachPaymentMethodInStripe (customer: string, method: string): Promise<any|null> {
    try {
      await this.stripeService.client.paymentMethods.attach(method, {
        customer
      })
    } catch (error) {
      console.error('paymentsService - attachPaymentMethod - error while attaching')
      return null
    }

    try {
      // Change the default invoice settings on the customer to the new payment method
      const updatedCustomer = await this.stripeService.client.customers.update(
        customer,
        {
          invoice_settings: {
            default_payment_method: method
          }
        }
      )

      return updatedCustomer
    } catch (error) {
      console.error('paymentsService - attachPaymentMethod - error while setting default payment method')
      return null
    }
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
