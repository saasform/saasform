import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from './auth.service'
import { UsersService } from '../accounts/services/users.service'
import { JwtService } from '@nestjs/jwt'
import { AccountsService } from '../accounts/services/accounts.service'

import { TypeOrmQueryService } from '@nestjs-query/query-typeorm'
import { UserCredentialsService } from '../accounts/services/userCredentials.service'
import { SettingsService } from '../settings/settings.service'
import { PaymentsService } from '../payments/services/payments.service'
import { PlansService } from '../payments/services/plans.service'

import {
  mockedSettingRepo,
  mockJwtService,
  mockAccountsService,
  mockUserCredentialsService,
  mockGenericRepo,
  mockPlansService,
  mockPaymentsService
} from '../accounts/test/testData'

const validUser = {
  user: { id: 1, email: 'main@email', isActive: true, data: { profile: { email: 'inside@email' } } },
  credential: {},
  account: {
    id: 101,
    data: {
      name: 'account name',
      payment: {
        sub: { current_period_end: 123456789, status: 'active' },
        plan: { name: 'plan name', price: 4900, provider: 'stripe' },
        methods: [{ id: 'pm_123' }]
      }
    }
  }
}

const noPaymentMethodUser = {
  user: { id: 1, email: 'main@email', isActive: true, data: { profile: { email: 'inside@email' } } },
  credential: {},
  account: {
    id: 101,
    data: {
      name: 'account name',
      payment: {
        sub: { current_period_end: 123456789, status: 'active' },
        plan: { name: 'plan name', price: 4900, provider: 'stripe' }
      }
    }
  }
}

const unpaidUser = {
  user: { id: 1, email: 'main@email', isActive: true, data: { profile: { email: 'inside@email' } } },
  credential: {},
  account: {
    id: 101,
    data: {
      name: 'account name',
      payment: {
        sub: { current_period_end: 123456789, status: 'unpaid' },
        plan: { name: 'plan name', price: 4900, provider: 'stripe' }
      }
    }
  }
}

const inactiveUser = {
  user: { id: 1, email: 'main@email', isActive: false, data: { profile: { email: 'inside@email' } } },
  credential: {},
  account: {
    id: 101,
    data: {
      name: 'account name',
      payment: {
        sub: { current_period_end: 123456789, status: 'active' },
        plan: { name: 'plan name', price: 4900, provider: 'stripe' }
      }
    }
  }
}

describe('AuthService', () => {
  let service: any

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        TypeOrmQueryService,
        { provide: UsersService, useValue: mockGenericRepo },
        { provide: JwtService, useValue: mockJwtService },
        { provide: AccountsService, useValue: mockAccountsService },
        { provide: UserCredentialsService, useValue: mockUserCredentialsService },
        { provide: SettingsService, useValue: mockedSettingRepo },
        { provide: PaymentsService, useValue: mockPaymentsService },
        { provide: PlansService, useValue: mockPlansService }
      ]
    }).compile()

    const _service = await module.get<AuthService>(AuthService)
    service = _service

    service.settingsService = mockedSettingRepo
    service.paymentsService = mockPaymentsService
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('User Token', () => {
    describe('Token payload', () => {
      it('Must add user data', async () => {
        const jwtData = await service.getTokenPayloadFromUserModel(validUser)
        expect(jwtData).toMatchObject(
          {
            nonce: '',
            id: 1,
            account_id: 101,
            account_name: 'account name',
            status: 'active',
            email: 'main@email',
            email_verified: false,
            staff: false,
            user_unused: '', // userData
            subs_exp: 123456789,
            subs_name: 'plan name',
            subs_status: 'active'
          }
        )
      })
    })

    describe('Subscription data [getTokenPayloadSubscripionData]', () => {
      it('Must add subscription data for full subscription', async () => {
        const payment = {
          sub: { current_period_end: 123456789, status: 'active' },
          plan: { name: 'plan name', price: 4900, provider: 'stripe' }
        }

        const subscriptionData = await service.getTokenPayloadSubscripionData(payment)

        const expectedSubscriptionData = {
          subs_exp: 123456789,
          subs_name: 'plan name',
          subs_status: 'active'
        }
        expect(subscriptionData).toEqual(expectedSubscriptionData)
      })

      it('Must add subscription data for free trial subscription', async () => {
        const payment = {
          sub: { current_period_end: 123456789, status: 'trial' },
          plan: { name: 'plan name', price: 4900, provider: 'stripe' }
        }

        const subscriptionData = await service.getTokenPayloadSubscripionData(payment)

        const expectedSubscriptionData = {
          subs_exp: 123456789,
          subs_name: 'plan name',
          subs_status: 'trial'
        }
        expect(subscriptionData).toEqual(expectedSubscriptionData)
      })
      it('Must add subscription data for enterprise subscription', async () => {
        const payment = {
          sub: { status: 'external' },
          plan: { name: 'plan name', provider: 'external' }
        }

        const subscriptionData = await service.getTokenPayloadSubscripionData(payment)

        const expectedSubscriptionData = {
          subs_name: 'plan name',
          subs_status: 'external'
        }
        expect(subscriptionData).toEqual(expectedSubscriptionData)
      })

      it('Must add subscription data for free tier subscription', async () => {
        const payment = {
          sub: { status: 'active' },
          plan: { name: 'plan name', price: 0, provider: 'stripe' }
        }

        const subscriptionData = await service.getTokenPayloadSubscripionData(payment)

        const expectedSubscriptionData = {
          subs_name: 'plan name',
          subs_status: 'active'
        }
        expect(subscriptionData).toEqual(expectedSubscriptionData)
      })
    })

    describe('Payment method status', () => {
      it('Must be true if the account is enterprise', async () => {
        const account = {
          id: 101,
          data: {
            name: 'account name',
            payment: {
              sub: { status: 'external' },
              plan: { name: 'plan name', provider: 'external' }
            }
          }
        }

        const paymentMethodStatus = await service.isPaymentMethodOK(account)

        expect(paymentMethodStatus).toEqual(true)
      })

      it('Must be true if the payment method is required and the account has a payment method', async () => {
        // mock payment service
        service.paymentsService = { getPaymentsConfig: jest.fn().mockReturnValue({ signup_force_payment: true }) }

        const account = {
          id: 101,
          data: {
            name: 'account name',
            payment: {
              sub: { current_period_end: 123456789, status: 'active' },
              plan: { name: 'plan name', price: 4900, provider: 'stripe' },
              methods: [{ id: 'pm_123' }]
            }
          }
        }

        const paymentMethodStatus = await service.isPaymentMethodOK(account)

        expect(paymentMethodStatus).toEqual(true)
      })

      it('Must be false if the payment method is required and the account does not have a payment method', async () => {
        // mock payment service
        service.paymentsService = { getPaymentsConfig: jest.fn().mockReturnValue({ signup_force_payment: true }) }

        const account = {
          id: 101,
          data: {
            name: 'account name',
            payment: {
              sub: { current_period_end: 123456789, status: 'active' },
              plan: { name: 'plan name', price: 4900, provider: 'stripe' }
            }
          }
        }

        const paymentMethodStatus = await service.isPaymentMethodOK(account)

        expect(paymentMethodStatus).toEqual(false)
      })

      it('Must be true if the payment method is not required', async () => {
        const account = {
          id: 101,
          data: {
            name: 'account name',
            payment: {
              sub: { current_period_end: 123456789, status: 'active' },
              plan: { name: 'plan name', price: 4900, provider: 'stripe' }
            }
          }
        }

        const paymentMethodStatus = await service.isPaymentMethodOK(account)

        expect(paymentMethodStatus).toEqual(true)
      })
    })

    describe('User status', () => {
      it('Must be true is the user is enabled', async () => {
        const user = { isActive: true }

        const userStatus = await service.isUserActive(user)

        expect(userStatus).toEqual(true)
      })

      it('Must be false is the user is disabled', async () => {
        const user = { isActive: false }

        const userStatus = await service.isUserActive(user)

        expect(userStatus).toEqual(false)
      })
    })

    describe('Subscription status', () => {
      it('Must be true if there is no subscription, but payment processor disabled ', async () => {
        // mock payment service
        service.paymentsService = { getPaymentsConfig: jest.fn().mockReturnValue({ payment_processor_enabled: false }) }

        const sub = null
        const plan = { id: 1 }

        const subStatus = await service.isSubscriptionPaid({ sub, plan })

        expect(subStatus).toEqual(true)
      })

      it('Must be true if the subscription is in one of the positive status', async () => {
        const subscriptionStatus = ['disabled', 'external', 'active', 'trialing']
        const plan = { id: 1 }

        for (let i = 0; i < subscriptionStatus.length; i++) {
          const sub = { current_period_end: 123456789, status: subscriptionStatus[i] }
          const subStatus = await service.isSubscriptionPaid({ sub, plan })
          expect(subStatus).toEqual(true)
        }
      })

      it('Must be false if the subscription is in one of the positive status', async () => {
        const subscriptionStatus = ['random', 'value']
        const plan = { id: 1 }

        for (let i = 0; i < subscriptionStatus.length; i++) {
          const sub = { current_period_end: 123456789, status: subscriptionStatus[i] }
          const subStatus = await service.isSubscriptionPaid({ sub, plan })
          expect(subStatus).toEqual(false)
        }
      })

      it('Must be true if payment is empty or null', async () => {
        const subStatus = await service.isSubscriptionPaid(null)
        expect(subStatus).toEqual(true)

        const subStatus2 = await service.isSubscriptionPaid({})
        expect(subStatus2).toEqual(true)
      })
    })

    describe('Authentication status', () => {
      it('Must be Active if payment method, user, and subscription are all valid', async () => {
        const status = await service.getTokenPayloadStatus(validUser)

        expect(status).toEqual('active')
      })
      it('Must be no_payment_method if payment method is not OK', async () => {
        // mock payment service
        service.paymentsService = { getPaymentsConfig: jest.fn().mockReturnValue({ signup_force_payment: true }) }

        const status = await service.getTokenPayloadStatus(noPaymentMethodUser)

        expect(status).toEqual('no_payment_method')
      })
      it('Must unpaid if subscription is not paid', async () => {
        const status = await service.getTokenPayloadStatus(unpaidUser)

        expect(status).toEqual('unpaid')
      })
      it('Must be invalid if payment method, user, and subscription are all not valid', async () => {
        const status = await service.getTokenPayloadStatus(inactiveUser)

        expect(status).toEqual('inactive_user')
      })
    })
  })
})
