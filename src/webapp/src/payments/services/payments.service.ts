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
import { ProvidersService } from './providers.service'

@QueryService(PaymentEntity)
@Injectable({ scope: Scope.REQUEST })
export class PaymentsService extends BaseService<PaymentEntity> {
  // private readonly paymentIntegration: string

  constructor (
    @Inject(REQUEST) private readonly req,
    private readonly configService: ConfigService,
    private readonly validationService: ValidationService,
    private readonly settingsService: SettingsService,
    private readonly stripeService: StripeService,
    private readonly killBillService: KillBillService,
    private readonly plansService: PlansService,
    private readonly providersService: ProvidersService
  ) {
    super(
      req,
      'PaymentEntity'
    )
    // this.paymentIntegration = this.configService.get<string>('MODULE_PAYMENT', 'stripe')
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
  async enrollOrUpdateAccount (account: AccountEntity, planHandle: string, paymentMethod: any, allowExternalPlan = false): Promise<any> {
    const config = await this.providersService.getPaymentsConfig()
    const provider = config.payment_processor_enabled === true ? config.payment_processor : null

    const payment = account?.data?.payment ?? {}

    if (payment.provider == null) {
      payment.provider = provider
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
      const plan = await this.plansService.getPlanFromHandle(planHandle, allowExternalPlan)
      if (plan != null) {
        payment.plan = plan
      }
    }
    const isFreeTier = payment.plan?.price === 0
    const isExternal = payment.plan?.provider === 'external'

    const isCustomerNeeded = payment.customer == null && ((!isFreeTier && !isExternal) || paymentMethod != null)

    // 2. Create customer
    if (isCustomerNeeded) {
      const inputCustomer = account?.getPaymentProviderCustomer()
      if (inputCustomer != null) {
        const customer = await this.providersService.createCustomer(account?.getPaymentProviderCustomer())
        if (customer != null) {
          payment.customer = customer
        }
      }
    }

    // 3. Add payment method
    if (paymentMethod != null) {
      const { customer, method } = await this.providersService.attachPaymentMethod(payment.customer, paymentMethod)
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
      if (isExternal) { // Enterprise
        payment.sub = { status: 'external' }
      } else if (isFreeTier) { // Free tier
        payment.sub = { status: 'active' }
      } else if (payment.plan?.freeTrial > 0 && payment.customer != null) { // Free trial
        payment.sub = await this.providersService.createSubscription(payment.customer, payment.plan)
      } else if (payment.methods != null && payment.customer != null) { // Full subscription
        payment.sub = await this.providersService.createSubscription(payment.customer, payment.plan)
      }
      // else, payment.subscription = null
      // This happens when a subscription is required, no free trial nor free tier is granted and the account is being created:
      // - the payment method was not required yet
      // - the account is created with an empty subscription
      // - later the payment method will be collected and the full subscription will be created (last branch of if)
    }

    return payment
  }

  async getPaymentsConfig (): Promise<any> {
    return await this.providersService.getPaymentsConfig()
  }

  getHtml (): any {
    return this.providersService.getHtml()
  }

  // OLD

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

  async subscribeToPlan (customer: string, paymentMethod: any, price: any): Promise<any> { // TODO: return a proper type
    return await this.stripeService.subscribeToPlan(customer, paymentMethod, price)
  }

  async updatePlan (subscriptionId: any, price: any): Promise<any> { // TODO: return a proper type
    return await this.stripeService.updatePlan(subscriptionId, price)
  }
}
