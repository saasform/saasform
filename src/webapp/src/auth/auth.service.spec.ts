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
import { CredentialType } from '../accounts/entities/userCredentials.entity'

const mockJwtService = {}
const mockAccountsService = {}

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
        { provide: PaymentsService, useValue: {} },
        { provide: PlansService, useValue: {} }
      ]
    }).compile()

    const _service = await module.get<AuthService>(AuthService)
    service = _service

    service.settingsService = mockedSettingRepo
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
      })
    })

    describe('JWT generation', () => {
      it('Must add user data', async () => {
        // console.log('us', service['settingsService'].getUserSettings())
        const validUser = {
          user: { id: 1, email: 'main@email', data: { profile: { email: 'inside@email' } } },
          credential: {},
          account: { id: 101, data: { name: 'account name' } }
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
        )
      })
    })

    describe('registerUser', () => {
      it('must fail when addUser fails', async () => {
        const newUser = {
          password: 'password',
          _csrf: '_csrf',
          accountEmail: 'accountEmail'
        }

        const res = await service.registerUser(newUser)
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

        const res = await service.registerUser(newUser)
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

        const res = await service.registerUser(newUser)
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
          add: jest.fn().mockReturnValue(null)
        }

        const newUser = {
          email: 'foo@email.com',
          password: 'password',
          _csrf: '_csrf',
          accountEmail: 'accountEmail'
        }

        const res = await service.registerUser(newUser)
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
          add: jest.fn().mockReturnValue({ account: 'mockAccount' })
        }

        const newUser = {
          email: 'foo@email.com',
          password: 'password',
          _csrf: '_csrf',
          accountEmail: 'accountEmail'
        }

        const res = await service.registerUser(newUser)
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

  describe('onGoogleSignin', () => {
    it('with a registered email and a connected google account, should return the expected user model', async () => {
      service.usersService = {
        findUser: jest.fn().mockReturnValue({ user: 'mockUser' })
      }
      service.userCredentialsService = {
        attachUserCredentials: jest.fn().mockReturnValue({}),
        findUserCredentialByEmail: jest.fn().mockReturnValue({ userCredentials: 'mockUserCredentials' })
      }
      service.accountsService = {
        findByUserId: jest.fn().mockReturnValue({ account: 'mockAccount' })
      }
      const expUserModel = await service.onGoogleSignin('user@gmail.com', '20weqa-2123-ps343-121kkl-21212')
      expect(expUserModel).toBeDefined()
    })
    it.skip('with a registered email and without a connected google account, should create the entity and return the expected user model', async () => {
      service.usersService = {
        findUser: jest.fn().mockReturnValue({ user: 'mockUser' })
      }
      service.userCredentialsService = {
        attachUserCredentials: jest.fn().mockReturnValue({}),
        findUserCredentialByEmail: jest.fn().mockReturnValue({ userCredentials: 'mockUserCredentials' })
      }

      const spyAttach = jest.spyOn(service.userCredentialsService, 'attachUserCredentials')

      const expUserModel = await service.onGoogleSignin('user@gmail.com', '20weqa-2123-ps343-121kkl-21212')
      expect(expUserModel).toBeDefined()

      expect(spyAttach).toBeCalledWith('ra@gmail.com',
        '21swq-2123-ps343-121kkl-21212',
        CredentialType.GOOGLE)
    })
    it('without a registered email, should return a non null value', async () => {
      service.usersService = {
        findUser: jest.fn().mockReturnValue(null),
        addUser: jest.fn().mockReturnValue({ id: 101 })
      }
      service.registerUser = jest.fn().mockReturnValue({
        user: { id: 'mockUser' },
        credential: { id: 'mockUserCredentials' },
        account: { id: 'mockAccount' }
      })
      service.accountsService.findByUserId = jest.fn().mockReturnValue({ id: 'mockAccount' })
      service.userCredentialsService = {
        attachUserCredentials: jest.fn().mockReturnValue({}),
        findUserCredentialByEmail: jest.fn().mockReturnValue(null)
      }

      const spy = jest.spyOn(service.usersService, 'findUser')
      const spyAttach = jest.spyOn(service.userCredentialsService, 'attachUserCredentials')

      const expUserModel = await service.onGoogleSignin('ra@gmail.com', '21swq-2123-ps343-121kkl-21212')
      expect(spy).not.toBeCalled()
      expect(spyAttach).toBeCalledWith('ra@gmail.com',
        '21swq-2123-ps343-121kkl-21212',
        CredentialType.GOOGLE)
      expect(expUserModel).not.toBeNull()
    })
    it('with null arguments, should return a null value', async () => {
      const expUserModel = await service.onGoogleSignin(null, null)
      expect(expUserModel).toBeNull()
    })
  })
})
