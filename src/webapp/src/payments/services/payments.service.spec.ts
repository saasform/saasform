import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { TypeOrmQueryService } from '@nestjs-query/query-typeorm'

import { PaymentEntity /* PaymentStatus */ } from '../entities/payment.entity'
import { PaymentsService } from './payments.service'
import { AccountEntity } from '../../accounts/entities/account.entity'
import { StripeService } from './stripe.service'
import { KillBillService } from './killbill.service'
import { ConfigService } from '@nestjs/config'
import { SettingsService } from '../../settings/settings.service'
import { ValidationService } from '../../validator/validation.service'

const deletedSubscription = new PaymentEntity()
const existingSubscription = new PaymentEntity()
const otherAccountSubscription = new PaymentEntity()

deletedSubscription.id = 1
deletedSubscription.account_id = 101
deletedSubscription.status = 'active'
deletedSubscription.stripe_id = 'sub_1'
deletedSubscription.data = { id: 'sub_1', status: 'active', active: 'true' }

existingSubscription.id = 2
existingSubscription.account_id = 101
existingSubscription.status = 'active'
existingSubscription.stripe_id = 'sub_2'
existingSubscription.data = { id: 'sub_2', status: 'active', active: 'true' }

otherAccountSubscription.id = 3
otherAccountSubscription.account_id = 109
otherAccountSubscription.status = 'active'
otherAccountSubscription.stripe_id = 'sub_4'
otherAccountSubscription.data = { id: 'sub_4', status: 'active', active: 'true' }

const paymentsArray = [
  deletedSubscription,
  existingSubscription
]

// This depends on Stripe. We need to update this when we support more payment processors
const subscriptionsArray = [
  { id: 'sub_2', status: 'active', active: 'false' },
  { id: 'sub_3', status: 'active', active: 'true' }
]

describe('Payments Service', () => {
  let service // Removed type paymentsService because we must overwrite the paymentsRepository property
  let repo: Repository<PaymentEntity>

  const mockedRepo = {
    query: jest.fn(
      query => {
        if (query?.filter?.account_id?.eq === 101) {
          return paymentsArray
        }
        if (query?.filter?.status?.in != null) {
          return paymentsArray
        }
        return [
          deletedSubscription,
          existingSubscription,
          otherAccountSubscription
        ]
      }),
    find: jest.fn(() => paymentsArray),
    createOne: jest.fn((payment) => { return payment }),
    updateOne: jest.fn((id, payment) => { return payment }),
    deleteOne: jest.fn(id => { return 0 })
  }

  // This depends on Stripe. We need to update this when we support more payment processors
  const mockedStripe = {
    customers: {
      retrieve: jest.fn(_ => ({ subscriptions: { data: subscriptionsArray } })),
      update: jest.fn(_ => {})
    },
    paymentMethods: {
      attach: jest.fn(_ => {})
    }
  }

  const mockedKillBill = {
  }

  const mockedSettingsService = {
    getWebsiteSettings: jest.fn(_ => ({}))
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: getRepositoryToken(PaymentEntity),
          useValue: mockedRepo
        },
        {
          provide: StripeService,
          useValue: mockedStripe
        },
        {
          provide: KillBillService,
          useValue: mockedKillBill
        },
        {
          provide: SettingsService,
          useValue: mockedSettingsService
        },
        ValidationService,
        {
          provide: ConfigService,
          useValue: {}
        },
        // We must also pass TypeOrmQueryService
        TypeOrmQueryService
      ]
    }).compile()

    service = await module.get(PaymentsService)
    repo = await module.get<Repository<PaymentEntity>>(
      getRepositoryToken(PaymentEntity)
    )

    // We must manually set the following because extending TypeOrmQueryService seems to break it
    Object.keys(mockedRepo).forEach(f => (service[f] = mockedRepo[f]))
    service.paymentsRepository = repo
    service.stripeService = { client: mockedStripe }
    service.killbillService = { accountApi: mockedKillBill }
    service.settingsService = mockedSettingsService
    service.validationService = await module.get(ValidationService)
    // Object.keys(mockedStripe).forEach(
    //   f => (service.stripeClient[f] = mockedStripe[f]),
    // );
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
    expect(service.paymentsRepository).toEqual(repo)
  })

  describe('getActivePayments', () => {
    it('should return a single payment', async () => {
      const repoSpy = jest.spyOn(mockedRepo, 'query')
      const accountId = 1
      const payments = await service.getActivePayments(accountId)
      expect(payments).toEqual(paymentsArray[0])
      expect(repoSpy).toBeCalledTimes(1)
      expect(repoSpy).toBeCalledWith({
        filter: {
          account_id: { eq: accountId },
          status: { in: ['active', 'trialing'] }
        }
      })
    })
  })

  describe('refreshPaymentsFromStripe', () => {
    it('should contact stripe for checking subscriptions updates', async () => {
      const stripeSpy = jest.spyOn(mockedStripe.customers, 'retrieve')
      const account = new AccountEntity()
      account.data = { stripe: { id: 'cus_1' } }
      await service.refreshPaymentsFromStripe(account)

      expect(stripeSpy).toBeCalledTimes(1)
      expect(stripeSpy).toBeCalledWith(
        account.data.stripe.id,
        { expand: ['subscriptions'] }
      )
    })

    it('should add new subscriptions', async () => {
      const repoSpy = jest.spyOn(service, 'createOne')
      const subscription = subscriptionsArray[1]
      const account = new AccountEntity()
      account.data = { stripe: { id: 'cus_1' } }
      account.id = 101
      await service.refreshPaymentsFromStripe(account)

      expect(repoSpy).toBeCalledTimes(1)
      expect(repoSpy).toBeCalledWith(
        {
          account_id: account.id,
          status: subscription.status,
          stripe_id: subscription.id,
          data: subscription
        }
      )
    })

    it('should delete not existing subscriptions for this account', async () => {
      const repoSpy = jest.spyOn(service, 'deleteOne')
      const account = new AccountEntity()
      account.data = { stripe: { id: 'cus_1' } }
      account.id = 101
      await service.refreshPaymentsFromStripe(account)

      expect(repoSpy).toBeCalledTimes(1)
      expect(repoSpy).toBeCalledWith(
        deletedSubscription.id
      )
    })

    it('should update existing subscriptions for this account', async () => {
      const repoSpy = jest.spyOn(service, 'updateOne')
      const account = new AccountEntity()
      account.data = { stripe: { id: 'cus_1' } }
      account.id = 101
      await service.refreshPaymentsFromStripe(account)

      const { id, ...sub } = existingSubscription
      const update = { ...sub, data: { id: 'sub_2', status: 'active', active: 'false' }, status: 'active' }
      // delete update.id FIXME

      expect(repoSpy).toBeCalledTimes(1)
      expect(repoSpy).toBeCalledWith(
        2, update
      )
    })
  })

  describe('attachPaymentMethod', () => {
    it('should attach the payment method to the stripe customer', async () => {
      const stripeSpy = jest.spyOn(mockedStripe.paymentMethods, 'attach')

      const account = { data: { stripe: { id: 'cus_123' } } }
      await service.attachPaymentMethod(account, 'met_456')
      expect(stripeSpy).toBeCalledWith('met_456', { customer: 'cus_123' })
    })

    it('should set the payment method as default', async () => {
      const stripeSpy = jest.spyOn(mockedStripe.customers, 'update')

      const account = { data: { stripe: { id: 'cus_123' } } }
      await service.attachPaymentMethod(account, 'met_456')
      expect(stripeSpy).toBeCalledWith('cus_123',
        {
          invoice_settings: {
            default_payment_method: 'met_456'
          }
        }
      )
    })
  })

  describe('getExpiringPayments', () => {
    it('should return the payments that are about to expire', async () => {
      const days = 5 // the default
      const today = Math.floor(Date.now() / 1000) - days * 3600 * 24

      service.query = jest.fn(q => [
        { id: 1, data: { trial_end: today - 3600 * 24 } },
        { id: 2, data: { trial_end: today } },
        { id: 3, data: { trial_end: today + 3600 * 24 } }
      ])

      const expiring = await service.getExpiringPayments()
      expect(expiring).toEqual([{ id: 2, data: { trial_end: today } }])
    })

    it('should allow to specify a custom number of days', async () => {
      const days = 6 // the default
      const today = Math.floor(Date.now() / 1000) - days * 3600 * 24

      service.query = jest.fn(q => [
        { id: 1, data: { trial_end: today - 3600 * 24 } },
        { id: 2, data: { trial_end: today } },
        { id: 3, data: { trial_end: today + 3600 * 24 } }
      ])

      const expiring = await service.getExpiringPayments(days)
      expect(expiring).toEqual([{ id: 2, data: { trial_end: today } }])
    })
  })

  describe('validators', () => {
    it('should validate active subscriptions', async () => {
      const paymentStatus = await service.isPaymentValid({ status: 'active' })
      expect(paymentStatus).toBeTruthy()
    })

    it('should validate traili subscriptions', async () => {
      const paymentStatus = await service.isPaymentValid({ status: 'trialing' })
      expect(paymentStatus).toBeTruthy()
    })

    it.skip('should not validate missing subscriptions', async () => {
      const paymentStatus = await service.isPaymentValid(null)
      expect(paymentStatus).toBeFalsy()
    })

    it('should not validate inactive subscriptions', async () => {
      const paymentStatus = await service.isPaymentValid({ status: 'suspended' })
      expect(paymentStatus).toBeFalsy()
    })

    it('should validate null subscriptions when subscription is not required', async () => {
      service.settingsService.getWebsiteSettings = jest.fn(_ => ({ subscription_optional: true }))
      const paymentStatus = await service.isPaymentValid(null)
      expect(paymentStatus).toBeTruthy()
    })
  })

  describe('subscribeToPlan', () => {
    it('should create a subscription', async () => {
      const customer = { id: 101 }
      const paymentMethod = { id: 201 }
      const price = { id: 301 }

      service.stripeService.client.subscriptions = { create: jest.fn().mockReturnValue({ id: 401 }) }

      const spy = jest.spyOn(service.stripeService.client.subscriptions, 'create')

      const subscription = await service.subscribeToPlan(customer, paymentMethod, price)

      expect(subscription).toEqual({ id: 401 })
      expect(spy).toBeCalledWith({
        customer,
        default_payment_method: paymentMethod.id,
        items: [
          { price: price.id }
        ],
        expand: ['latest_invoice.payment_intent']
      })
    })

    it('should return null if it fails to create a subscription', async () => {
      const customer = { id: 101 }
      const paymentMethod = { id: 201 }
      const price = { id: 301 }

      service.stripeService.client.subscriptions = { create: jest.fn().mockReturnValue(null) }

      const subscription = await service.subscribeToPlan(customer, paymentMethod, price)

      expect(subscription).toBeNull()
    })
  })

  describe('updatePlan', () => {
    it('should update a subscription', async () => {
      // Mocks
      const subscriptionToUpdate = { items: { data: [{ id: 'sub_12345' }] } }
      const updatedSubscription = { id: 'updatedSubscription' }

      service.stripeService.client.subscriptions = {
        update: jest.fn().mockReturnValue(updatedSubscription),
        retrieve: jest.fn().mockReturnValue(subscriptionToUpdate)
      }

      // Spies
      const spy = jest.spyOn(service.stripeService.client.subscriptions, 'update')

      // Params
      const price = { id: 301 }
      const subscriptionId = 'sub_12345'

      const subscription = await service.updatePlan(subscriptionId, price)

      // Assertions
      expect(subscription).toEqual(updatedSubscription)
      expect(spy).toBeCalledWith(subscriptionId, {
        cancel_at_period_end: false,
        items: [{
          id: subscriptionToUpdate.items.data[0].id,
          price: price.id
        }]
      })
    })

    it('should return null if it fails to update a subscription', async () => {
      // Mocks
      const subscriptionToUpdate = { items: { data: [{ id: 'sub_12345' }] } }
      const updatedSubscription = null

      service.stripeService.client.subscriptions = {
        update: jest.fn().mockReturnValue(updatedSubscription),
        retrieve: jest.fn().mockReturnValue(subscriptionToUpdate)
      }

      // Spies
      const spy = jest.spyOn(service.stripeService.client.subscriptions, 'update')

      // Params
      const price = { id: 301 }
      const subscriptionId = 'sub_12345'

      const subscription = await service.updatePlan(subscriptionId, price)

      expect(subscription).toBeNull()
      expect(spy).toBeCalledTimes(1)
    })

    it('should return null if there is no subscription to update', async () => {
      // Mocks
      const subscriptionToUpdate = null
      const updatedSubscription = { id: 'updatedSubscription' }

      service.stripeService.client.subscriptions = {
        update: jest.fn().mockReturnValue(updatedSubscription),
        retrieve: jest.fn().mockReturnValue(subscriptionToUpdate)
      }

      // Spies
      const spy = jest.spyOn(service.stripeService.client.subscriptions, 'update')

      // Params
      const price = { id: 301 }
      const subscriptionId = 'sub_12345'

      const subscription = await service.updatePlan(subscriptionId, price)

      expect(subscription).toBeNull()
      expect(spy).toBeCalledTimes(0)
    })
  })
})
