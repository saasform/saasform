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
  mockPaymentsService,
  mockList
} from '../accounts/test/testData'

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
        // console.log('us', service['settingsService'].getUserSettings())
        /* const validUser = {
          user: { id: 1, email: 'main@email', data: { profile: { email: 'inside@email' } } },
          credential: {},
          account: { id: 101, data: { name: 'account name', plan: {} } }
        }

        const jwtData = await service.getTokenPayloadFromUserModel(validUser)
        expect(jwtData).toMatchObject(
          {
            nonce: '',
            id: 1,
            account_id: 101,
            account_name: 'account name',
            email: 'main@email',
            email_verified: false,
            staff: false,
            status: 'active',
            user_email: 'inside@email',
            user_unused: ''
          }
        ) */
      })
    })

    describe('Subscription data', () => {
      it('Must add subscription data for full subscription', async () => {})
      it('Must add subscription data for free trial subscription', async () => {})
      it('Must add subscription data for enterprise subscription', async () => {})
      it('Must add subscription data for free tier subscription', async () => {})
    })

    describe('Payment method status', () => {
      it('Must be true if the account is enterprise', async () => {})
      it('Must be true if the payment method is required and the account has a payment method', async () => {})
      it('Must be false if the payment method is required and the account does not have a payment method', async () => {})
      it('Must be true if the payment method is not required', async () => {})
    })

    describe('User status', () => {
      it('Must be true is the user is enabled', async () => {})
      it('Must be false is the user is disabled', async () => {})
    })

    describe('Subscription status', () => {
      it('Must be true if there is no subscription, but payment processor disabled ', async () => {})
      it('Must be true if the subscription is in one of the positive status', async () => {})
    })

    describe('Authentication status', () => {
      it('Must be Active if payment method, user, and subscription are all valid', async () => {})
      it('Must be no_payment_method if payment method is not OK', async () => {})
      it('Must unpaid if subscription is not paid', async () => {})
      it('Must be invalid if payment method, user, and subscription are all not valid', async () => {})
    })
  })
})
