import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from './auth.service'
import { UsersService } from '../accounts/services/users.service'
import { JwtService } from '@nestjs/jwt'
import { AccountsService } from '../accounts/services/accounts.service'
import { mockedRepo, mockedUserCredentials, mockUserCredentialsService } from '../accounts/test/testData'
import { TypeOrmQueryService } from '@nestjs-query/query-typeorm'
import { UserCredentialsService } from '../accounts/services/userCredentials.service'

const mockJwtService = {}
const mockAccountsService = {}

describe('AuthService', () => {
  let service: AuthService

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        TypeOrmQueryService,
        {
          provide: UsersService,
          useValue: mockedRepo
        },
        { provide: JwtService, useValue: mockJwtService },
        { provide: AccountsService, useValue: mockAccountsService },
        { provide: UserCredentialsService, useValue: mockUserCredentialsService }
      ]
    }).compile()

    service = await module.get<AuthService>(AuthService)
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
    it.skip('Cookie domain for primary = 2nd level, request via 3rd', () => {
      const requestHostname = 'beta.uplom.com'
      const primaryDomain = 'uplom.com'
      expect(service.getJwtCookieDomain(requestHostname, primaryDomain)).toBe('uplom.com')
    })
    it.skip('Cookie domain for primary = 3rd level', () => {
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
