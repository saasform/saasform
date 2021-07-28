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

import { AccountEntity } from '../../accounts/entities/account.entity'

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

describe('Payments Service - enrollOrUpdateAccount', () => {
  let service // Removed type paymentsService because we must overwrite the paymentsRepository property
  let stripeService
  let repo: Repository<PaymentEntity>

  let account
  let planHandle
  let paymentMethod
  let mockPlan
  let mockSettings

  let mockStripeCustomer
  let mockStripeSub

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
      update: jest.fn(_ => {}),
      create: jest.fn(_ => (mockStripeCustomer)),
    },
    paymentMethods: {
      attach: jest.fn(_ => {})
    },
    subscriptions: {
      create: jest.fn(_ => (mockStripeSub)),
    },
  }

  const mockedKillBill = {
  }

  const mockedSettingsService = {
    getWebsiteRenderingVariables: jest.fn(_ => (mockSettings))
  }

  const mockedPlanService = {
    getPlanFromHandle: jest.fn(_ => (mockPlan))
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
        // We must also pass TypeOrmQueryService
        TypeOrmQueryService
      ]
    }).compile()

    service = await module.get(PaymentsService)
    stripeService = await module.get(StripeService)
    repo = await module.get<Repository<PaymentEntity>>(
      getRepositoryToken(PaymentEntity)
    )

    // this is not really unit test, we're going 1 level deep and testing also StripeService
    stripeService.client = mockedStripe
    stripeService.enabled = true

    // We must manually set the following because extending TypeOrmQueryService seems to break it
    Object.keys(mockedRepo).forEach(f => (service[f] = mockedRepo[f]))
    service.paymentsRepository = repo
    service.stripeService = stripeService
    service.killbillService = { accountApi: mockedKillBill }
    service.settingsService = mockedSettingsService
    service.plansService = mockedPlanService
    service.validationService = await module.get(ValidationService)

    service.paymentIntegration = 'stripe'
    service.paymentProcessor = stripeService
    // Object.keys(mockedStripe).forEach(
    //   f => (service.stripeClient[f] = mockedStripe[f]),
    // );

    account = new AccountEntity()
    planHandle = ''
    paymentMethod = null
    mockSettings = {}
    mockPlan = {}
    mockStripeCustomer = { object: 'customer', id: 'cus_123' }
    mockStripeSub = { object: 'subscription', id: 'sub_123' }
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
    expect(service.paymentsRepository).toEqual(repo)
  })

  describe('getPaymentsConfig', () => {
    it('default = stripe', async () => {
      const config = await service.getPaymentsConfig()
      expect(config).toEqual({
        payment_processor: 'stripe',
        payment_processor_enabled: true,
        signup_force_payment: false,
      })
    })

    it('signup_force_payment: true', async () => {
      mockSettings = {
        signup_force_payment: true
      }

      const config = await service.getPaymentsConfig()
      expect(config).toEqual({
        payment_processor: 'stripe',
        payment_processor_enabled: true,
        signup_force_payment: true,
      })
    })

    it('Stripe disabled', async () => {
      stripeService.enabled = false

      const config = await service.getPaymentsConfig()
      expect(config).toEqual({
        payment_processor: 'stripe',
        payment_processor_enabled: false,
        signup_force_payment: false,
      })
    })
  })

  describe('enrollOrUpdateAccount - subscription succeed', () => {
    it('should create an external subscription [create account via admin dashboard]', async () => {
      mockPlan = {
        provider: 'external'
      }

      const payment = await service.enrollOrUpdateAccount(account, planHandle, paymentMethod)

      const expectedPayment = {
        provider: 'stripe',
        plan: mockPlan,
        sub: {
          status: 'external'
        }
      }
      expect(payment).toEqual(expectedPayment)
    })

    it('should create a free tier [signup]', async () => {
      mockPlan = {
        price: 0
      }

      const payment = await service.enrollOrUpdateAccount(account, planHandle, paymentMethod)

      const expectedPayment = {
        provider: 'stripe',
        plan: mockPlan,
        sub: {
          status: 'active'
        }
      }
      expect(payment).toEqual(expectedPayment)
    })

    it('should create a free trial [signup]', async () => {
      mockPlan = {
        price: 10,
        freeTrial: 14
      }

      const payment = await service.enrollOrUpdateAccount(account, planHandle, paymentMethod)

      const expectedPayment = {
        provider: 'stripe',
        plan: mockPlan,
        customer: mockStripeCustomer,
        sub: mockStripeSub,
      }
      expect(payment).toEqual(expectedPayment)
    })

    it('should update a free trial when a payment method is passed [add payment method]', async () => {
      paymentMethod = { id: 123 }
      mockPlan = {
        price: 10,
        freeTrial: 14
      }

      const payment = await service.enrollOrUpdateAccount(account, planHandle, paymentMethod)

      const expectedPayment = {
        provider: 'stripe',
        plan: mockPlan,
        customer: mockStripeCustomer,
        sub: mockStripeSub,
      }
      expect(payment).toEqual(expectedPayment)
    })

    it('should not create a full subscription if no payment method is set [signup]', async () => { })

    it('should create a full subscription when a payment method is passed [add payment method]', async () => { })
  })

  describe('enrollOrUpdateAccount - subscription not created', () => {
    it('should not create a subscription if already set', async () => { })

    it('should not create a subscription if payment provider is not set', async () => { })
  })

  describe('enrollOrUpdateAccount - customer not set', () => {
    it('should create an external subscription if customer is not set', async () => { })

    it('should create a free tier if customer is not set', async () => { })

    it('should not create a free trial if customer is not set', async () => { })

    it('should not create a full subscription if customer is not set', async () => { })
  })

  describe('enrollOrUpdateAccount - no provider', () => {
    it('should not create an external subscription when provider is null', async () => { })

    it('should not create a free tier when provider is null', async () => { })

    it('should not create a free trial when provider is null', async () => { })

    it('should not create a full subscription when provider is null', async () => { })
  })

  describe('enrollOrUpdateAccount - payment processor', () => {
    it('should not overwrite the payment processor if already set', async () => { })

    it('should fail if there is a payment processor mismatch', async () => { })
  })

  describe('enrollOrUpdateAccount - plan', () => {
    it('should add a plan if not set', async () => { })

    it('should not overwrite a plan if already set', async () => { })
  })

  describe('enrollOrUpdateAccount - customer', () => {
    it('should not overwrite a customer if already set', async () => { })

    it('should create a customer for free trial', async () => { })

    it('should create a customer for full subscription', async () => { })

    it('should not create a customer for enterprise if payment method is not passed', async () => { })

    it('should not create a customer for free tier if payment method is not passed', async () => { })

    it('should create a customer for enterprise if payment method is passed', async () => { })

    it('should create a customer for free tier if payment method is passed', async () => { })
  })

  describe('enrollOrUpdateAccount - payment method', () => {
    it('should add the first payment method', async () => { })

    it('should add the second payment method', async () => { })

    it('should update the customer when adding a payment method', async () => { })
  })

  describe('enrollOrUpdateAccount - inputs', () => {
    it('should not fail on all null', async () => {
      // const payment = await service.enrollOrUpdateAccount(null, null, null)
      // expect(payment).toEqual({})
    })

    it('should add the second payment method', async () => { })

    it('should update the customer when adding a payment method', async () => { })
  })
})
