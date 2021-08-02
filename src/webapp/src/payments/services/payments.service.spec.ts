import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { TypeOrmQueryService } from '@nestjs-query/query-typeorm'

import { PaymentEntity /* PaymentStatus */ } from '../entities/payment.entity'
import { PaymentsService } from './payments.service'
import { StripeService } from './stripe.service'
import { KillBillService } from './killbill.service'
import { ConfigService } from '@nestjs/config'
import { SettingsService } from '../../settings/settings.service'
import { ValidationService } from '../../validator/validation.service'
import { PlansService } from './plans.service'
import { ProvidersService } from './providers.service'

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
  let stripeService
  let providersService
  let repo: Repository<PaymentEntity>
  const apiOptions = { timeout: 5000 }

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

  const mockedPlanService = {
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
        StripeService,
        {
          provide: KillBillService,
          useValue: mockedKillBill
        },
        {
          provide: SettingsService,
          useValue: mockedSettingsService
        },
        {
          provide: PlansService,
          useValue: mockedPlanService
        },
        ValidationService,
        {
          provide: ConfigService,
          useValue: { get: () => {} }
        },
        ProvidersService,
        // We must also pass TypeOrmQueryService
        TypeOrmQueryService
      ]
    }).compile()

    service = await module.get(PaymentsService)
    stripeService = await module.get(StripeService)
    providersService = await module.get(ProvidersService)
    repo = await module.get<Repository<PaymentEntity>>(
      getRepositoryToken(PaymentEntity)
    )

    stripeService.client = mockedStripe

    // We must manually set the following because extending TypeOrmQueryService seems to break it
    Object.keys(mockedRepo).forEach(f => (service[f] = mockedRepo[f]))
    service.paymentsRepository = repo
    service.providersService = providersService
    service.providersService.stripeService = stripeService
    service.providersService.killbillService = { accountApi: mockedKillBill }
    service.settingsService = mockedSettingsService
    service.providersService.settingsService = mockedSettingsService
    service.validationService = await module.get(ValidationService)

    // service.paymentProcessor = stripeService

    service.providersService.paymentProcessor = stripeService
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
          account_id: { eq: accountId }
        }
      })
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

  describe.skip('subscribeToPlan', () => {
    it.skip('should create a subscription', async () => {
      const customer = { id: 101 }
      const paymentMethod = { id: 201 }
      const price = { id: 301 }

      service.providersService.stripeService.client.subscriptions = { create: jest.fn().mockReturnValue({ id: 401 }) }

      const spy = jest.spyOn(service.providersService.stripeService.client.subscriptions, 'create')

      const subscription = await service.subscribeToPlan(customer, paymentMethod, price)

      expect(subscription).toEqual({ id: 401 })
      expect(spy).toBeCalledWith({
        customer,
        default_payment_method: paymentMethod.id,
        items: [
          { price: price.id }
        ],
        expand: ['latest_invoice.payment_intent']
      }, apiOptions)
    })

    it.skip('should return null if it fails to create a subscription', async () => {
      const customer = { id: 101 }
      const paymentMethod = { id: 201 }
      const price = { id: 301 }

      service.providersService.stripeService.client.subscriptions = { create: jest.fn().mockReturnValue(null) }

      const subscription = await service.providersService.subscribeToPlan(customer, paymentMethod, price)

      expect(subscription).toBeNull()
    })
  })

  describe.skip('updatePlan', () => {
    it.skip('should update a subscription', async () => {
      // Mocks
      const subscriptionToUpdate = { items: { data: [{ id: 'sub_12345' }] } }
      const updatedSubscription = { id: 'updatedSubscription' }

      service.providersService.stripeService.client.subscriptions = {
        update: jest.fn().mockReturnValue(updatedSubscription),
        retrieve: jest.fn().mockReturnValue(subscriptionToUpdate)
      }

      // Spies
      const spy = jest.spyOn(service.providersService.stripeService.client.subscriptions, 'update')

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
      }, apiOptions)
    })

    it('should return null if it fails to update a subscription', async () => {
      // Mocks
      const subscriptionToUpdate = { items: { data: [{ id: 'sub_12345' }] } }
      const updatedSubscription = null

      service.providersService.stripeService.client.subscriptions = {
        update: jest.fn().mockReturnValue(updatedSubscription),
        retrieve: jest.fn().mockReturnValue(subscriptionToUpdate)
      }

      // Spies
      const spy = jest.spyOn(service.providersService.stripeService.client.subscriptions, 'update')

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

      service.providersService.stripeService.client.subscriptions = {
        update: jest.fn().mockReturnValue(updatedSubscription),
        retrieve: jest.fn().mockReturnValue(subscriptionToUpdate)
      }

      // Spies
      const spy = jest.spyOn(service.providersService.stripeService.client.subscriptions, 'update')

      // Params
      const price = { id: 301 }
      const subscriptionId = 'sub_12345'

      const subscription = await service.updatePlan(subscriptionId, price)

      expect(subscription).toBeNull()
      expect(spy).toBeCalledTimes(0)
    })
  })
})
