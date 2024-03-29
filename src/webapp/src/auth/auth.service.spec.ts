import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from './auth.service'
import { UsersService } from '../accounts/services/users.service'
import { JwtService } from '@nestjs/jwt'
import { AccountsService } from '../accounts/services/accounts.service'
import { mockedSettingRepo, mockedUserCredentials, mockUserCredentialsService, mockGenericRepo } from '../accounts/test/testData'
import { TypeOrmQueryService } from '@nestjs-query/query-typeorm'
import { UserCredentialsService } from '../accounts/services/userCredentials.service'
import { SettingsService } from '../settings/settings.service'
import { PaymentsService } from '../payments/services/payments.service'
import { PlansService } from '../payments/services/plans.service'
import { UserError, ErrorTypes } from '../utilities/common.model'

const mockJwtService = {}
const mockAccountsService = {
  getAccountByDomain: async (domain) => (null)
}
const mockPaymentsService = {
  getPaymentsConfig: async () => ({}),
  refreshPaymentsFromStripe: async () => {},
  getActivePayments: async (accountId) => (null)
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
        { provide: PlansService, useValue: {} }
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

  describe('Users authentication', () => {
    describe('validateUser', () => {
      describe('with email/password', () => {
        it.skip('with registered email and valid password', async () => {
          const expUser = await service.validateUser(mockedUserCredentials.credential, 'password')
          expect(expUser).toBeDefined()
        })
        /*
        // Linters complains about null or undefined
        it('with registered email and undefined password', async () => {
          const expUser = await service.validateUser(mockedUserCredentials.credential, undefined)
          expect(expUser).not.toBeDefined()
        })
        it('with registered email and null password', async () => {
          const expUser = await service.validateUser(mockedUserCredentials.credential, null)
          expect(expUser).not.toBeDefined()
        })
        */
        it('with registered email and empty password', async () => {
          const expUser = await service.validateUser('werqw@email.com', '')
          expect(expUser).toBeNull()
        })
        it.skip('with unregistered email and password', async () => {
          const expUser = await service.validateUser('werqw@email.com', 'sasawqwqw')
          expect(expUser).toBeNull()
        })
        /*
        // Linters complains about null or undefined
        it('with unregistered email and undefined password', async () => {
          const expUser = await service.validateUser('werqw@email.com', undefined)
          expect(expUser).not.toBeDefined()
        })
        it('with unregistered email and null password', async () => {
          const expUser = await service.validateUser('werqw@email.com', null)
          expect(expUser).not.toBeDefined()
        })
        */
        it('with unregistered email and empty password', async () => {
          const expUser = await service.validateUser('werqw@email.com', '')
          expect(expUser).toBeNull()
        })

        it('should allow unverified email when verification is NOT required', async () => {
          service.getUserInfo = jest.fn().mockReturnValue({
            user: { id: 'mockedUser', emailConfirmed: false },
            credential: { id: 'mockedCredential' },
            account: { id: 'mockedAccount', email_verification_required: false }
          })
          service.userCredentialsService.isRegistered = jest.fn().mockReturnValue(true)
          const expUser = await service.validateUser(mockedUserCredentials.credential, 'password')
          expect(expUser).not.toBeNull()
        })

        it('should NOT allow unverified email when verification is required and emailConfirmed is not set', async () => {
          service.getUserInfo = jest.fn().mockReturnValue({
            user: { id: 'mockedUser' },
            credential: { id: 'mockedCredential' },
            account: { id: 'mockedAccount', email_verification_required: true }
          })
          service.userCredentialsService.isRegistered = jest.fn().mockReturnValue(true)
          const expUser = await service.validateUser(mockedUserCredentials.credential, 'password')
          expect(expUser).toBeNull()
        })

        it('should NOT allow unverified email when verification is required and emailConfirmed is false', async () => {
          service.getUserInfo = jest.fn().mockReturnValue({
            user: {
              id: 'mockedUser',
              emailConfirmed: false
            },
            credential: { id: 'mockedCredential' },
            account: { id: 'mockedAccount', email_verification_required: true }
          })
          service.userCredentialsService.isRegistered = jest.fn().mockReturnValue(true)
          const expUser = await service.validateUser(mockedUserCredentials.credential, 'password')
          expect(expUser).toBeNull()
        })

        it('should NOT allow unverified email when verification is required and emailConfirmed is true', async () => {
          service.getUserInfo = jest.fn().mockReturnValue({
            user: {
              id: 'mockedUser',
              emailConfirmed: true
            },
            credential: { id: 'mockedCredential' },
            account: { id: 'mockedAccount', email_verification_required: true }
          })
          service.userCredentialsService.isRegistered = jest.fn().mockReturnValue(true)
          const expUser = await service.validateUser(mockedUserCredentials.credential, 'password')
          expect(expUser).not.toBeNull()
        })
      })
    })

    describe('registerUser', () => {
      it('must fail when addUser fails', async () => {
        const newUser = {
          password: 'password',
          _csrf: '_csrf',
          accountEmail: 'accountEmail'
        }

        const res = await service.registerUser({ body: newUser })
        expect(res).toBeNull()
      })

      it('must fail when addUser fails', async () => {
        const userError = new UserError(ErrorTypes.DUPLICATE_EMAIL, 'email already existing')
        service.usersService = {
          addUser: jest.fn().mockReturnValue(userError)
        }

        const newUser = {
          email: 'foo@email.com',
          password: 'password',
          _csrf: '_csrf',
          accountEmail: 'accountEmail'
        }

        const res = await service.registerUser({ body: newUser })
        expect(res).toBe(userError)
      })

      it('must fail when credential is not found', async () => {
        service.usersService = {
          addUser: jest.fn().mockReturnValue({ user: 'mockUser' })
        }
        service.userCredentialsService = {
          findUserCredentialByEmail: jest.fn().mockReturnValue(null)
        }

        const newUser = {
          email: 'foo@email.com',
          password: 'password',
          _csrf: '_csrf',
          accountEmail: 'accountEmail'
        }

        const res = await service.registerUser({ body: newUser })
        expect(res).toBeNull()
      })

      it('must fail if account is not added', async () => {
        service.usersService = {
          addUser: jest.fn().mockReturnValue({ user: 'mockUser' })
        }
        service.userCredentialsService = {
          findUserCredentialByEmail: jest.fn().mockReturnValue({ userCredentials: 'mockUserCredentials' })
        }
        service.accountsService = {
          addOrAttach: jest.fn().mockReturnValue(null)
        }

        const newUser = {
          email: 'foo@email.com',
          password: 'password',
          _csrf: '_csrf',
          accountEmail: 'accountEmail'
        }

        const res = await service.registerUser({ body: newUser })
        expect(res).toBeNull()
      })

      it('must return a ValidUser if there were no errors', async () => {
        service.usersService = {
          addUser: jest.fn().mockReturnValue({ user: 'mockUser' })
        }
        service.userCredentialsService = {
          findUserCredentialByEmail: jest.fn().mockReturnValue({ userCredentials: 'mockUserCredentials' })
        }
        service.accountsService = {
          addOrAttach: jest.fn().mockReturnValue({ account: 'mockAccount' })
        }

        const newUser = {
          email: 'foo@email.com',
          password: 'password',
          _csrf: '_csrf',
          accountEmail: 'accountEmail'
        }

        const res = await service.registerUser({ body: newUser })
        expect(res).toEqual({
          user: { user: 'mockUser' },
          credential: { userCredentials: 'mockUserCredentials' },
          account: { account: 'mockAccount' }
        })
      })
    })
  })

  describe('Cookie', () => {
    it('Cookie domain for localhost', () => {
      const requestHostname = 'uplom.localhost'
      const primaryDomain = 'anything'
      expect(service.getJwtCookieDomain(requestHostname, primaryDomain)).toBe('uplom.localhost')
    })
    it('Cookie domain for mysaasform.com', () => {
      const requestHostname = 'uplom.mysaasform.com'
      const primaryDomain = 'anything'
      expect(service.getJwtCookieDomain(requestHostname, primaryDomain)).toBe('uplom.mysaasform.com')
    })
    it('Cookie domain for primary unset', () => {
      const requestHostname = 'www.uplom.com'
      const primaryDomain = ''
      expect(service.getJwtCookieDomain(requestHostname, primaryDomain)).toBe('www.uplom.com')
    })
    it('Cookie domain for primary not listed', () => {
      const requestHostname = 'www.uplom.com'
      const primaryDomain = 'uplom.localhost'
      expect(service.getJwtCookieDomain(requestHostname, primaryDomain)).toBe('www.uplom.com')
    })
    it('Cookie domain for primary = 2nd level', () => {
      const requestHostname = 'uplom.com'
      const primaryDomain = 'uplom.com'
      expect(service.getJwtCookieDomain(requestHostname, primaryDomain)).toBe('uplom.com')
    })
    it('Cookie domain for primary = 2nd level, request via 3rd', () => {
      const requestHostname = 'beta.uplom.com'
      const primaryDomain = 'uplom.com'
      expect(service.getJwtCookieDomain(requestHostname, primaryDomain)).toBe('uplom.com')
    })
    it('Cookie domain for primary = 3rd level', () => {
      const requestHostname = 'beta.uplom.com'
      const primaryDomain = 'beta.uplom.com'
      expect(service.getJwtCookieDomain(requestHostname, primaryDomain)).toBe('uplom.com')
    })
    it('Cookie domain for primary = 3rd level, request via 2nd', () => {
      const requestHostname = 'uplom.com'
      const primaryDomain = 'beta.uplom.com'
      expect(service.getJwtCookieDomain(requestHostname, primaryDomain)).toBe('uplom.com')
    })
  })
})
