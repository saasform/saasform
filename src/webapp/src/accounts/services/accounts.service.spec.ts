import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { TypeOrmQueryService } from '@nestjs-query/query-typeorm'

import { AccountEntity } from '../entities/account.entity'
import { AccountsService } from './accounts.service'

import { UserEntity } from '../entities/user.entity'
import { AccountUserEntity } from '../entities/accountUser.entity'
import { AccountsUsersService } from './accountsUsers.service'
import { UsersService } from './users.service'

import { UserCredentialsService } from './userCredentials.service'
import { UserCredentialsEntity } from '../entities/userCredentials.entity'
import { mockUserCredentialsEntity } from '../test/testData'
import { NotificationsService } from '../../notifications/notifications.service'
import { SettingsService } from '../../settings/settings.service'
import { PaymentsService } from '../../payments/services/payments.service'
import { PlansService } from '../../payments/services/plans.service'

const accountsArray = [
  new AccountEntity(),
  new AccountEntity(),
  new AccountEntity()
]

describe('Accounts Service', () => {
  let service // Removed type AccountsService because we must overwrite the accountsRepository property
  let repo: Repository<AccountEntity>
  let userRepo: Repository<UserEntity>
  let accountsUsersRepo: Repository<AccountUserEntity>

  let user: UserEntity

  const mockedRepo = {
    find: jest.fn().mockResolvedValue(accountsArray),
    createOne: jest.fn(account => account),
    findById: jest.fn(id => {
      const account = new AccountEntity()
      account.id = id
      return account
    }),
    updateOne: jest.fn((id, account) => account)
  }

  const mockedUserRepo = {
    findByEmail: jest.fn(email =>
      email === 'existing@test.com' ? new UserEntity() : null
    ),
    addUser: jest.fn(user => user),
    findOrCreateUser: jest.fn(email =>
      email === 'foo@bar.it' ? new UserEntity() : null
    )
  }

  const mockedAccountsUsersRepo = {
    addUser: jest.fn((user, account) => user),
    addStripeUser: jest.fn((user, plan) => user)
  }

  // This depends on Stripe. We need to update this when we support more payment processors
  const mockedPaymentsService = {
    createBillingCustomer: jest.fn(_ => {}),
    createStripeFreeSubscription: jest.fn(_ => {})
  }

  const mockedPlansService = { getPlans: jest.fn(_ => [{}]) }

  beforeEach(async () => {
    jest.clearAllMocks()

    user = new UserEntity()
    user.id = 101
    user.email = 'foo@bar.it'

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        {
          provide: getRepositoryToken(AccountEntity),
          useValue: mockedRepo
        },
        AccountsUsersService,
        {
          provide: getRepositoryToken(AccountUserEntity),
          useValue: mockedAccountsUsersRepo
        },
        UsersService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockedUserRepo
        },
        UserCredentialsService,
        {
          provide: getRepositoryToken(UserCredentialsEntity),
          useValue: mockUserCredentialsEntity
        },
        {
          provide: NotificationsService,
          useValue: { sendEmail: jest.fn((to, template, data) => true) }
        },
        {
          provide: SettingsService,
          useValue: {}
        },
        {
          provide: PaymentsService,
          useValue: mockedPaymentsService
        },
        {
          provide: PlansService,
          useValue: mockedPlansService
        },
        // We must also pass TypeOrmQueryService
        TypeOrmQueryService
      ]
    }).compile()

    service = await module.get(AccountsService)
    repo = await module.get<Repository<AccountEntity>>(
      getRepositoryToken(AccountEntity)
    )
    accountsUsersRepo = await module.get<Repository<AccountUserEntity>>(
      getRepositoryToken(AccountUserEntity)
    )
    userRepo = await module.get<Repository<UserEntity>>(
      getRepositoryToken(UserEntity)
    )

    // We must manually set the following because extending TypeOrmQueryService seems to break it
    Object.keys(mockedRepo).forEach(f => (service[f] = mockedRepo[f]))
    service.accountsRepository = repo
    service.usersService = userRepo
    service.accountsUsersService = accountsUsersRepo
    service.paymentsService = mockedPaymentsService
    service.plansService = mockedPlansService
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
    expect(service.accountsRepository).toEqual(repo)
  })

  describe('getAll', () => {
    it('should return an array of Accounts', async () => {
      const repoSpy = jest.spyOn(mockedRepo, 'find')
      const accounts = await service.getAll()
      expect(accounts).toEqual(accountsArray)
      expect(repoSpy).toBeCalledTimes(1)
      expect(repoSpy).toBeCalledWith()
    })
  })

  describe('Add an account', () => {
    it('should create the account and give the proper name', async () => {
      const repoSpy = jest.spyOn(mockedRepo, 'createOne')
      await service.add({ data: { name: 'foo bar' } })

      expect(repoSpy).toBeCalledWith(
        expect.objectContaining({
          data: { name: 'foo bar' }
        })
      )
    })

    it('should link the account to the owner when called with the owner', async () => {
      const repoSpy = jest.spyOn(mockedRepo, 'createOne')
      await service.add({ data: {}, user })

      expect(repoSpy).toBeCalledWith(
        expect.objectContaining({
          data: { name: undefined },
          owner_id: 101
        })
      )
    })

    it('should add owner to the AccountUser model, when called with the owner', async () => {
      const repoSpy = jest.spyOn(mockedAccountsUsersRepo, 'addUser')
      await service.add({ data: { name: 'foo bar' }, user })

      expect(repoSpy).toBeCalledTimes(1)

      const addedUser = repoSpy.mock.calls[0]

      expect(addedUser[0].email).toBe(user.email)
      expect(addedUser[1].data.name).toBe('foo bar')
    })

    it('should not add owner to the AccountUser model, when called without the owner', async () => {
      const repoSpy = jest.spyOn(mockedAccountsUsersRepo, 'addUser')
      await service.add({ data: { name: 'foo bar' } })

      expect(repoSpy).toBeCalledTimes(0)
    })
  })

  describe('Invite user', () => {
    describe('Invite a new User', () => {
      it('Should create a new User', async () => {
        const repoSpy = jest.spyOn(mockedUserRepo, 'findOrCreateUser')
        await service.inviteUser(user, 1)

        expect(repoSpy).toBeCalledTimes(1)
      })

      // TODO: move into userService spec
      it.skip('The new User should have a random password', async () => {
        const repoSpy = jest.spyOn(mockedAccountsUsersRepo, 'addUser')
        await service.inviteUser(user, 1)

        const invitedUser = repoSpy.mock.calls[0][0]

        expect(invitedUser.password).not.toBeNull()
        expect(invitedUser.password).not.toBeUndefined()
      })

      // TODO: move into userService spec
      it.skip('The new User should have requested a reset password', async () => {
        // It would be better if we could mock the whole UserEntity
        // to have a better control on who calles who. IMPROVE HERE.
        const repoSpy = jest.spyOn(mockedAccountsUsersRepo, 'addUser')
        await service.inviteUser(user, 1)
        const invitedUser = repoSpy.mock.calls[0][0]

        expect(invitedUser.data.resetPasswordToken).not.toBeNull()
        expect(invitedUser.data.resetPasswordToken).not.toBeUndefined()
        expect(invitedUser.data.resetPasswordTokenExp).not.toBeNull()
        expect(invitedUser.data.resetPasswordTokenExp).not.toBeUndefined()
      })

      // TODO
      it.skip('The new User should be associated with the correct account', async () => {
        jest.restoreAllMocks()
        const repoSpy = jest.spyOn(mockedAccountsUsersRepo, 'addUser')
        await service.inviteUser(user, 1)
        expect(repoSpy).toBeCalledTimes(1)

        const invitedAccount = repoSpy.mock.calls[0][1]

        expect(invitedAccount).toBe(1)
      })

      describe('Invite an existing User', () => {
        it('Should find or create a new User', async () => {
          jest.clearAllMocks()
          const repoSpy = jest.spyOn(mockedUserRepo, 'findOrCreateUser')

          await service.inviteUser({ email: 'foo@bar.it' }, 1)

          expect(repoSpy).toBeCalledTimes(1)
        })

        it.skip('The new User should have not requested a reset password', async () => {
          jest.clearAllMocks()
          // It would be better if we could mock the whole UserEntity
          // to have a better control on who calles who. IMPROVE HERE.
          const repoSpy = jest.spyOn(mockedAccountsUsersRepo, 'addUser')
          await service.inviteUser({ email: 'foo@bar.it' }, 1)
          expect(repoSpy).toBeCalledTimes(1)

          const invitedUser = repoSpy.mock.calls[0][0]

          expect(invitedUser.data.resetPasswordToken).toBeUndefined()
          expect(invitedUser.data.resetPasswordTokenExp).toBeUndefined()
        })
      })
    })
  })
})
