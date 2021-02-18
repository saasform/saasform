import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { TypeOrmQueryService } from '@nestjs-query/query-typeorm'

import { AccountUserEntity } from '../entities/accountUser.entity'
import { AccountsUsersService } from './accountsUsers.service'

import { UsersService } from './users.service'
import { UserEntity } from '../entities/user.entity'
import { AccountsService } from './accounts.service'
import { AccountEntity } from '../entities/account.entity'
import { UserCredentialsService } from './userCredentials.service'
import { UserCredentialsEntity } from '../entities/userCredentials.entity'
import { mockUserCredentialsEntity } from '../test/testData'
import { NotificationsService } from '../../notifications/notifications.service'
import { SettingsService } from '../../settings/settings.service'
import { PaymentsService } from '../../payments/services/payments.service'
import { PlansService } from '../../payments/services/plans.service'

describe('AccountsUsers Service', () => {
  let service // Removed type AccountsService because we must overwrite the accountsRepository property
  let repo: Repository<AccountUserEntity>

  const mockedRepo = {
    find: jest.fn().mockReturnValue([]),
    query: jest.fn().mockReturnValue([]),
    createOne: jest.fn(accountUser => accountUser)
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockedRepo
        },
        AccountsService,
        {
          provide: getRepositoryToken(AccountEntity),
          useValue: mockedRepo
        },
        AccountsUsersService,
        {
          provide: getRepositoryToken(AccountUserEntity),
          useValue: mockedRepo
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
          useValue: {}
        },
        {
          provide: PlansService,
          useValue: {}
        },
        // We must also pass TypeOrmQueryService
        TypeOrmQueryService
      ]
    }).compile()

    service = await module.get(AccountsUsersService)
    repo = await module.get<Repository<AccountUserEntity>>(
      getRepositoryToken(AccountUserEntity)
    )

    // We must manually set the following because extending TypeOrmQueryService seems to break it
    Object.keys(mockedRepo).forEach(f => (service[f] = mockedRepo[f]))
    service.accountsUsersRepository = repo
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
    expect(service.accountsUsersRepository).toEqual(repo)
  })

  describe('getAll', () => {
    it('should return an array of AccountsUsers for the account called', async () => {
      const repoSpy = jest.spyOn(mockedRepo, 'query')
      const accountId = 1
      const accountsUsers = await service.getUsers(accountId)
      expect(accountsUsers).toEqual([])
      expect(repoSpy).toBeCalledTimes(1)
      expect(repoSpy).toBeCalledWith({
        filter: { account_id: { eq: accountId } }
      })
    })
  })
})
