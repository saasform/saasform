import { Test, TestingModule } from '@nestjs/testing'
import { NotImplementedException } from '@nestjs/common'
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

describe('Payments Service - enrollOrUpdateAccount', () => {
  let service // Removed type paymentsService because we must overwrite the paymentsRepository property
  let stripeService
  let providersService
  let repo: Repository<PaymentEntity>

  let account
  let planHandle
  let paymentMethod
  let mockPlan
  let mockSettings

  let mockStripeCustomer
  let mockStripeCustomerWithDefaultPayment
  let mockStripeSub
  let mockedStripePaymentMethod

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
      update: jest.fn(_ => (mockStripeCustomerWithDefaultPayment)),
      create: jest.fn(_ => (mockStripeCustomer))
    },
    paymentMethods: {
      attach: jest.fn(_ => (mockedStripePaymentMethod))
    },
    subscriptions: {
      create: jest.fn(_ => (mockStripeSub))
    }
  }

  const mockedKillBill = {
  }

  const mockedSettingsService = {
    getWebsiteRenderingVariables: jest.fn(_ => (mockSettings)),
    getTrialLength: jest.fn(_ => (7))
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

    // this is not really unit test, we're going 1 level deep and testing also StripeService
    stripeService.client = mockedStripe
    stripeService.enabled = true

    // We must manually set the following because extending TypeOrmQueryService seems to break it
    Object.keys(mockedRepo).forEach(f => (service[f] = mockedRepo[f]))
    service.paymentsRepository = repo
    service.providersService = providersService
    service.providersService.stripeService = stripeService
    service.providersService.killbillService = { accountApi: mockedKillBill }
    service.providersService.settingsService = mockedSettingsService

    service.settingsService = mockedSettingsService
    service.plansService = mockedPlanService
    service.validationService = await module.get(ValidationService)

    service.providersService.paymentIntegration = 'stripe'
    service.providersService.paymentProcessor = stripeService
    // Object.keys(mockedStripe).forEach(
    //   f => (service.stripeClient[f] = mockedStripe[f]),
    // );

    account = new AccountEntity()
    planHandle = ''
    paymentMethod = null
    mockSettings = {}
    mockPlan = {}
    mockStripeCustomer = { object: 'customer', id: 'cus_123' }
    mockStripeCustomerWithDefaultPayment = { object: 'customer', id: 'cus_123', default_payment_method: 'met_123' }
    mockStripeSub = { object: 'subscription', id: 'sub_123' }
    mockedStripePaymentMethod = { object: 'method', id: 'met_123' }
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
        signup_force_payment: false
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
        signup_force_payment: true
      })
    })

    it('Stripe disabled', async () => {
      stripeService.enabled = false

      const config = await service.getPaymentsConfig()
      expect(config).toEqual({
        payment_processor: 'stripe',
        payment_processor_enabled: false,
        signup_force_payment: false
      })
    })
  })

  describe('enrollOrUpdateAccount - subscription succeed', () => {
    /*
      #golden test = stripe + free trial + add payment method
      used as a basis for other corner cases
    */

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
        sub: mockStripeSub
      }
      expect(payment).toEqual(expectedPayment)
    })

    it('should update a free trial when a payment method is passed [add payment method] #golden', async () => {
      paymentMethod = { id: 123 }
      mockPlan = {
        price: 10,
        freeTrial: 14
      }

      const payment0 = await service.enrollOrUpdateAccount(account, planHandle, null)
      expect(payment0).toEqual({
        provider: 'stripe',
        plan: mockPlan,
        customer: mockStripeCustomer,
        sub: mockStripeSub
      })

      account.data.payment = payment0
      const payment = await service.enrollOrUpdateAccount(account, null, paymentMethod)

      const expectedPayment = {
        provider: 'stripe',
        plan: mockPlan,
        customer: mockStripeCustomerWithDefaultPayment,
        sub: mockStripeSub,
        methods: [mockedStripePaymentMethod]
      }
      expect(payment).toEqual(expectedPayment)
    })

    it('should not create a full subscription if no payment method is set [signup]', async () => {
      mockPlan = {
        price: 10,
        freeTrial: 0
      }

      const payment = await service.enrollOrUpdateAccount(account, planHandle, paymentMethod)

      const expectedPayment = {
        provider: 'stripe',
        plan: mockPlan,
        customer: mockStripeCustomer
      }
      expect(payment).toEqual(expectedPayment)
    })

    it('should create a full subscription when a payment method is passed [add payment method]', async () => {
      paymentMethod = { id: 123 }
      mockPlan = {
        price: 10,
        freeTrial: 0
      }

      const payment0 = await service.enrollOrUpdateAccount(account, planHandle, null)
      expect(payment0).toEqual({
        provider: 'stripe',
        plan: mockPlan,
        customer: mockStripeCustomer
      })

      account.data.payment = payment0
      const payment = await service.enrollOrUpdateAccount(account, null, paymentMethod)

      const expectedPayment = {
        provider: 'stripe',
        plan: mockPlan,
        customer: mockStripeCustomerWithDefaultPayment,
        sub: mockStripeSub,
        methods: [mockedStripePaymentMethod]
      }
      expect(payment).toEqual(expectedPayment)
    })
  })

  describe('enrollOrUpdateAccount - subscription not created', () => {
    it('should not create a subscription if already set', async () => {
      mockPlan = {
        price: 10,
        freeTrial: 14
      }

      const existingPlan = { id: 4567 }
      const existingCustomer = { id: 4568 }
      const existingSub = { id: 4569 }
      account.data.payment = {
        provider: 'stripe',
        plan: existingPlan,
        customer: existingCustomer,
        sub: existingSub
      }

      const payment = await service.enrollOrUpdateAccount(account, planHandle, paymentMethod)

      const expectedPayment = {
        provider: 'stripe',
        plan: existingPlan,
        customer: existingCustomer,
        sub: existingSub
      }
      expect(payment).toEqual(expectedPayment)
    })

    /* DUPE
    it('should not create a subscription if payment provider is not set', async () => {
      stripeService.enabled = false
      // if stripe is disabled, customer will return null. In theory also subscriptions etc. but they are unnecessary
      mockStripeCustomer = null

      mockPlan = {
        price: 10,
        freeTrial: 14
      }

      const payment = await service.enrollOrUpdateAccount(account, planHandle, paymentMethod)

      const expectedPayment = {
        provider: null,
        plan: mockPlan,
      }
      expect(payment).toEqual(expectedPayment)
    }) */
  })

  describe('enrollOrUpdateAccount - customer not set', () => {
    it('should create an external subscription if customer is not set', async () => {
      mockStripeCustomer = null // simulate one Stripe call failure
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

    it('should create a free tier if customer is not set', async () => {
      mockStripeCustomer = null // simulate one Stripe call failure
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

    it('should not create a free trial if customer is not set', async () => {
      mockStripeCustomer = null // simulate one Stripe call failure
      mockPlan = {
        price: 10,
        freeTrial: 14
      }

      const payment = await service.enrollOrUpdateAccount(account, planHandle, paymentMethod)

      const expectedPayment = {
        provider: 'stripe',
        plan: mockPlan
      }
      expect(payment).toEqual(expectedPayment)
    })

    it('should not create a full subscription if customer is not set', async () => {
      mockStripeCustomer = null // simulate one Stripe call failure
      mockPlan = {
        price: 10,
        freeTrial: 0
      }

      const payment = await service.enrollOrUpdateAccount(account, planHandle, paymentMethod)

      const expectedPayment = {
        provider: 'stripe',
        plan: mockPlan
      }
      expect(payment).toEqual(expectedPayment)
    })
  })

  describe('enrollOrUpdateAccount - no provider', () => {
    it('should not create an external subscription when provider is null', async () => {
      stripeService.enabled = false
      // if stripe is disabled, customer will return null. In theory also subscriptions etc. but they are unnecessary
      mockStripeCustomer = null

      mockPlan = {
        provider: 'external'
      }

      const payment = await service.enrollOrUpdateAccount(account, planHandle, paymentMethod)

      const expectedPayment = {
        provider: null,
        plan: mockPlan
      }
      expect(payment).toEqual(expectedPayment)
    })

    it('should not create a free tier when provider is null', async () => {
      stripeService.enabled = false
      // if stripe is disabled, customer will return null. In theory also subscriptions etc. but they are unnecessary
      mockStripeCustomer = null

      mockPlan = {
        price: 0
      }

      const payment = await service.enrollOrUpdateAccount(account, planHandle, paymentMethod)

      const expectedPayment = {
        provider: null,
        plan: mockPlan
      }
      expect(payment).toEqual(expectedPayment)
    })

    it('should not create a free trial when provider is null', async () => {
      stripeService.enabled = false
      // if stripe is disabled, customer will return null. In theory also subscriptions etc. but they are unnecessary
      mockStripeCustomer = null

      mockPlan = {
        price: 10,
        freeTrial: 14
      }

      const payment = await service.enrollOrUpdateAccount(account, planHandle, paymentMethod)

      const expectedPayment = {
        provider: null,
        plan: mockPlan
      }
      expect(payment).toEqual(expectedPayment)
    })

    it('should not create a full subscription when provider is null', async () => {
      stripeService.enabled = false
      // if stripe is disabled, customer will return null. In theory also subscriptions etc. but they are unnecessary
      mockStripeCustomer = null

      mockPlan = {
        price: 10,
        freeTrial: 0
      }

      const payment = await service.enrollOrUpdateAccount(account, planHandle, paymentMethod)

      const expectedPayment = {
        provider: null,
        plan: mockPlan
      }
      expect(payment).toEqual(expectedPayment)
    })
  })

  describe('enrollOrUpdateAccount - payment processor', () => {
    it('should set the payment processor after it gets enabled', async () => {
      stripeService.enabled = false
      // if stripe is disabled, customer will return null. In theory also subscriptions etc. but they are unnecessary
      const customer = { ...mockStripeCustomer }
      mockStripeCustomer = null

      paymentMethod = { id: 123 }
      mockPlan = {
        price: 10,
        freeTrial: 14
      }

      const payment0 = await service.enrollOrUpdateAccount(account, planHandle, null)
      expect(payment0).toEqual({
        provider: null,
        plan: mockPlan
      })

      stripeService.enabled = true
      mockStripeCustomer = customer
      account.data.payment = payment0
      const payment = await service.enrollOrUpdateAccount(account, null, paymentMethod)

      const expectedPayment = {
        provider: 'stripe',
        plan: mockPlan,
        customer: mockStripeCustomerWithDefaultPayment,
        sub: mockStripeSub,
        methods: [mockedStripePaymentMethod]
      }
      expect(payment).toEqual(expectedPayment)
    })

    it('should fail if there is a payment processor mismatch', async () => {
      paymentMethod = { id: 123 }
      mockPlan = {
        price: 10,
        freeTrial: 14
      }

      const payment0 = await service.enrollOrUpdateAccount(account, planHandle, null)
      expect(payment0).toEqual({
        provider: 'stripe',
        plan: mockPlan,
        customer: mockStripeCustomer,
        sub: mockStripeSub
      })

      service.providersService.paymentIntegration = 'killbill'

      account.data.payment = payment0
      let error
      try {
        await service.enrollOrUpdateAccount(account, planHandle, paymentMethod)
      } catch (e) {
        error = e
      }
      expect(error).toStrictEqual(new NotImplementedException('Payment provider mismatch'))
    })
  })

  describe('enrollOrUpdateAccount - plan', () => {
    it('should add a plan if not set', async () => {
      paymentMethod = { id: 123 }
      const plan0 = {
        name: 'plan0',
        price: 10,
        freeTrial: 14
      }
      mockPlan = null

      const payment0 = await service.enrollOrUpdateAccount(account, planHandle, null)
      expect(payment0).toEqual({
        provider: 'stripe',
        customer: mockStripeCustomer
      })

      mockPlan = plan0
      account.data.payment = payment0
      const payment = await service.enrollOrUpdateAccount(account, planHandle, paymentMethod)

      const expectedPayment = {
        provider: 'stripe',
        plan: plan0,
        customer: mockStripeCustomerWithDefaultPayment,
        sub: mockStripeSub,
        methods: [mockedStripePaymentMethod]
      }
      expect(payment).toEqual(expectedPayment)
    })

    it('should not overwrite a plan if already set', async () => {
      paymentMethod = { id: 123 }
      const plan0 = {
        name: 'plan0',
        price: 10,
        freeTrial: 14
      }
      const plan1 = {
        name: 'plan1',
        price: 20,
        freeTrial: 7
      }
      mockPlan = plan0

      const payment0 = await service.enrollOrUpdateAccount(account, planHandle, null)
      expect(payment0).toEqual({
        provider: 'stripe',
        plan: plan0,
        customer: mockStripeCustomer,
        sub: mockStripeSub
      })

      mockPlan = plan1
      account.data.payment = payment0
      const payment = await service.enrollOrUpdateAccount(account, planHandle, paymentMethod)

      const expectedPayment = {
        provider: 'stripe',
        plan: plan0,
        customer: mockStripeCustomerWithDefaultPayment,
        sub: mockStripeSub,
        methods: [mockedStripePaymentMethod]
      }
      expect(payment).toEqual(expectedPayment)
    })
  })

  describe('enrollOrUpdateAccount - customer', () => {
    it('should not overwrite a customer if already set', async () => { })

    // same as subscription succeed, external
    // it('should not create a customer for external if payment method is not passed', async () => { })

    // same as subscription succeed, free tier
    // it('should not create a customer for free tier if payment method is not passed', async () => { })

    it('should create a customer for external if payment method is passed', async () => {
      paymentMethod = { id: 123 }
      mockPlan = {
        provider: 'external'
      }

      const payment = await service.enrollOrUpdateAccount(account, planHandle, paymentMethod)

      const expectedPayment = {
        provider: 'stripe',
        plan: mockPlan,
        sub: {
          status: 'external'
        },
        customer: mockStripeCustomerWithDefaultPayment,
        methods: [mockedStripePaymentMethod]
      }
      expect(payment).toEqual(expectedPayment)
    })

    it('should create a customer for free tier if payment method is passed', async () => {
      paymentMethod = { id: 123 }
      mockPlan = {
        price: 0
      }

      const payment = await service.enrollOrUpdateAccount(account, planHandle, paymentMethod)

      const expectedPayment = {
        provider: 'stripe',
        plan: mockPlan,
        sub: {
          status: 'active'
        },
        customer: mockStripeCustomerWithDefaultPayment,
        methods: [mockedStripePaymentMethod]
      }
      expect(payment).toEqual(expectedPayment)
    })

    // same as subscription succeed, free trial #golden
    // it('should create a customer for free trial', async () => { })

    // same as subscription succeed, full
    // it('should create a customer for full subscription', async () => { })
  })

  describe('enrollOrUpdateAccount - payment method', () => {
    // same as subscription succeed, free trial #golden
    // it('should add the first payment method', async () => { })

    it('should add the second payment method', async () => {
      paymentMethod = { id: 123 }
      mockPlan = {
        price: 10,
        freeTrial: 14
      }

      const stripePaymentMethod0 = { object: 'method', id: 'met_123' }
      const stripePaymentMethod1 = { object: 'method', id: 'met_456' }

      const payment0 = await service.enrollOrUpdateAccount(account, planHandle, null)
      expect(payment0).toEqual({
        provider: 'stripe',
        plan: mockPlan,
        customer: mockStripeCustomer,
        sub: mockStripeSub
      })

      mockedStripePaymentMethod = stripePaymentMethod0
      account.data.payment = payment0
      const payment1 = await service.enrollOrUpdateAccount(account, null, paymentMethod)

      expect(payment1).toEqual({
        provider: 'stripe',
        plan: mockPlan,
        customer: mockStripeCustomerWithDefaultPayment,
        sub: mockStripeSub,
        methods: [stripePaymentMethod0]
      })

      mockedStripePaymentMethod = stripePaymentMethod1
      account.data.payment = payment1
      const payment = await service.enrollOrUpdateAccount(account, null, paymentMethod)

      const expectedPayment = {
        provider: 'stripe',
        plan: mockPlan,
        customer: mockStripeCustomerWithDefaultPayment,
        sub: mockStripeSub,
        methods: [stripePaymentMethod0, stripePaymentMethod1]
      }
      expect(payment).toEqual(expectedPayment)
    })

    it('should update the customer when adding a payment method', async () => {
      paymentMethod = { id: 123 }
      mockPlan = {
        price: 10,
        freeTrial: 14
      }

      const payment0 = await service.enrollOrUpdateAccount(account, planHandle, null)
      expect(payment0).toEqual({
        provider: 'stripe',
        plan: mockPlan,
        customer: mockStripeCustomer,
        sub: mockStripeSub
      })

      account.data.payment = payment0
      const payment = await service.enrollOrUpdateAccount(account, null, paymentMethod)

      const expectedPayment = {
        provider: 'stripe',
        plan: mockPlan,
        customer: mockStripeCustomerWithDefaultPayment,
        sub: mockStripeSub,
        methods: [mockedStripePaymentMethod]
      }
      expect(payment).toEqual(expectedPayment)
    })
  })

  describe('enrollOrUpdateAccount - inputs', () => {
    it('should not fail on all null', async () => {
      mockPlan = {
        price: 10,
        freeTrial: 14
      }

      const payment = await service.enrollOrUpdateAccount(null, null, null)
      expect(payment).toEqual({
        provider: 'stripe',
        plan: mockPlan
      })
    })

    it('should not fail on all null (stripe disabled)', async () => {
      stripeService.enabled = false
      mockPlan = null

      const payment = await service.enrollOrUpdateAccount(null, null, null)
      expect(payment).toEqual({
        provider: null
      })
    })

    it('should create a subscription when everything but account is null', async () => {
      mockPlan = {
        price: 10,
        freeTrial: 14
      }

      const payment = await service.enrollOrUpdateAccount(account, null, null)
      expect(payment).toEqual({
        provider: 'stripe',
        plan: mockPlan,
        customer: mockStripeCustomer,
        sub: mockStripeSub
      })
    })
  })
})
