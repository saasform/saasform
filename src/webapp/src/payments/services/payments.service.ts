import { REQUEST } from '@nestjs/core'
import { Injectable, Scope, Inject } from '@nestjs/common'
import { Query, QueryService } from '@nestjs-query/core'
import { TypeOrmQueryService } from '@nestjs-query/query-typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, getRepository, getConnection } from 'typeorm'

import { BaseService } from '../../utilities/base.service'
// PaymentStatus is giving issues. Check on PaymentEntity
import { PaymentEntity /* PaymentStatus */ } from '../entities/payment.entity'
// TODO: move stripe functions inside this module
import { AccountEntity } from '../../accounts/entities/account.entity'
import { StripeService } from './stripe.service'




@QueryService(PaymentEntity)
@Injectable({ scope: Scope.REQUEST })
export class PaymentsService extends BaseService<PaymentEntity> {
  constructor (
    @Inject(REQUEST) private readonly req,
    // @InjectRepository(PaymentEntity)
    // private readonly usersRepository: Repository<UserEntity>,
    private readonly stripeService: StripeService
  ) {
    super(
      req,
      'PaymentEntity'
    )
  }

  /**
   * Retuns the active subcsription for an account.
   * @param account_id
   */
  async getActivePayments (account_id: number): Promise<PaymentEntity|null> {
    try {
      const payments = await this.query({
        filter: {
          account_id: { eq: account_id },
          status: { in: ['active', 'trialing'] }
        }
      })
      return payments && payments[0] ? payments[0] : null
    } catch (error) {
      console.error(
        'getActivePayments - error in query',
        account_id,
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
  async refreshPaymentsFromStripe (account: AccountEntity) {
    if (!account || !account.data || !account.data.stripe) return null

    try {
      const customer = await this.stripeService.client.customers.retrieve(
        account.data.stripe.id,
        { expand: ['subscriptions'] }
      )

      const payments = await this.query({
        filter: { account_id: { eq: account.id } }
      })
      const active_subscriptions = customer.subscriptions.data.map(
        s => s.id
      )
      const payments_ids = payments.map(p => p.stripe_id)

      // Delete removed payments
      for (let i = 0; i < payments.length; i++) {
        const p = payments[i]
        !active_subscriptions.includes(p.stripe_id) &&
              (await this.deleteOne(p.id))
      }

      // Create new payments.
      for (let i = 0; i < customer.subscriptions.data.length; i++) {
        const subscription = customer.subscriptions.data[i]
        !payments_ids.includes(subscription.id) &&
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
        if (match) {
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

  async createPaymentMethod (customer: string, card: any) {
    const { number, exp_month, exp_year, cvc } = card
    const paymentMethod = await this.stripeService.client.paymentMethods.create({
      type: 'card',
      card: {
        number, exp_month, exp_year, cvc
      }
    })

    const attachedPaymentMethod = await this.stripeService.client.paymentMethods.attach(
      paymentMethod.id,
      { customer }
    )

    // TODO: check errors

    // TODO: make default.
    /*
  await stripe.customers.update(req.body.customerId, {
    invoice_settings: {
      default_payment_method: req.body.paymentMethodId,
    },
  });
    */

    return paymentMethod
  }

  async subscribeToPlan (customer: string, paymentMethod: any, price: any) {
    const subscription = await this.stripeService.client.subscriptions.create({
      customer,
      default_payment_method: paymentMethod.id,
      items: [
        { price: price.id }
      ]
    })

    // TODO: check errors
  }

  async createStripeCustomer (customer) {
    try {
      const stripeCustomer = await this.stripeService.client.customers.create(
        customer
      );
  
      if(stripeCustomer == null) {
        console.error('paymentService - createStripeCustomer - error while creating stripe customer', customer);
      }
  
      return stripeCustomer  
    }
    catch(error) {
      console.error('paymentService - createStripeCustomer - error while creating stripe customer', customer, error);
    }
  }

  async createStripeFreeSubscription (plan, user) {
    // TODO: fix the trial duration
    const trial_days = 10
    const trial_end = Math.floor(Date.now() / 1000) + trial_days * 24 * 60 * 60

    try {
      // TODO: fix the price to use
      const subscription = await this.stripeService.client.subscriptions.create({
        customer: user.id,
        items: [{ price: plan.prices.year.id }],
        trial_end
      })

      return subscription
    }
    catch(error) {
      console.error('paymentService - createStripeCustomer - error while creating free plan', plan, user, error);
      return null
    }
  };
}
