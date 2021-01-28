// import { REQUEST } from '@nestjs/core'
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { TypeOrmQueryService } from '@nestjs-query/query-typeorm'

// import { mockServer } from 'graphql-tools'

import { UsersService } from './users.service'
import { UserEntity } from '../entities/user.entity'
import { NewUserInput } from '../dto/new-user.input'
// import { SettingsEntity } from '../settings/settings.entity'
// import { SettingsService } from '../settings/settings.service'
// import { CommunicationService } from '../communication/communication.service'
import { mockedCommunicationService, mockedRandom, mockedRepo, mockedUser, mockedUserExpiredToken, mockUserCredentialsEntity } from '../test/testData'
import { UserCredentialsService } from '../services/userCredentials.service'
import { UserCredentialsEntity } from '../entities/userCredentials.entity'

// const mockRepository = {}

describe('UsersService', () => {
  let service // Removed type AccountsService because we must overwrite the accountsRepository property
  let repo: Repository<UserEntity>
  // let settingsRepo: Repository<SettingsEntity>
  // let communicationService

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockedRepo
        },
        // SettingsService,
        // {
        //   provide: getRepositoryToken(SettingsEntity),
        //   useValue: mockedSettingRepo
        // },
        // CommunicationService,
        UserCredentialsService,
        {
          provide: getRepositoryToken(UserCredentialsEntity),
          useValue: { ...mockUserCredentialsEntity, changePassword: jest.fn() }
        },
        // We must also pass TypeOrmQueryService
        TypeOrmQueryService
        // It would be nice to mock the whole UserEntity to better control
        // UserEntity,
        // {
        //   provide: UserEntity,
        //   useValue: {
        //     ...UserEntity,
        //     resetPassword: jest.fn(_ => {return true;})
        //   }
        // }
      ]
    }).compile()

    service = await module.get(UsersService)
    repo = await module.get<Repository<UserEntity>>(
      getRepositoryToken(UserEntity)
    )
    // settingsRepo = await module.get<Repository<SettingsEntity>>(
    //   getRepositoryToken(SettingsEntity)
    // )

    // We must manually set the following because extending TypeOrmQueryService seems to break it
    Object.keys(mockedRepo).forEach(f => (service[f] = mockedRepo[f]))
    service.accountsRepository = repo
    service.userCredentialsService = { ...mockUserCredentialsEntity, changePassword: jest.fn() }
    // service.settingsService = settingsRepo
    service.communicationService = mockedCommunicationService
    service.random = { ...mockedRandom }
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
    expect(service.accountsRepository).toEqual(repo)
  })

  describe('Email confirmation', () => {
    it.skip('should set the email confirmation token and flag when a user is created', async () => {
      const repoSpy = jest.spyOn(mockedRepo, 'createOne')
      const userInput: NewUserInput = new NewUserInput()
      userInput.email = 'foo@email.com'
      userInput.password = 'password'
      userInput.data = { name: 'foo', email: 'foo@email.com' }

      await service.addUser(userInput)

      const addedUser: UserEntity = repoSpy.mock.calls[0][0]
      expect(repoSpy).toBeCalledTimes(1)
      expect(addedUser.data.emailConfirmationToken).not.toBeNull()
      expect(addedUser.emailConfirmationToken).not.toBeNull()
      expect(addedUser.emailConfirmationToken).toBe(addedUser.data.emailConfirmationToken)

      /*
      Here we get the difference between the expiration date and now.
      This number should be around 24*60*60 = 86400.
      We allow some delay to account for the test running time (1 minute).
      */
      expect(addedUser.data.emailConfirmationTokenExp).not.toBeNull()
      const exp =
        (addedUser.data.emailConfirmationTokenExp -
          new Date().getTime()) /
        1000
      // TODO: fix the expected date with something less hardcoded
      expect(exp).toBeGreaterThanOrEqual(24 * 60 * 60 - 60)
      expect(exp).toBeLessThanOrEqual(24 * 60 * 60)

      expect(addedUser.data.emailConfirmed).toBeFalsy()
    })

    it('should send the confirmation email', async () => {
    })

    it.skip('should remove the token and set the confirmation token ', async () => {
      const repoSpy = jest.spyOn(mockedRepo, 'updateOne')
      const confirmedUser: UserEntity = await service.confirmEmail(mockedUser.emailConfirmationToken)

      expect(repoSpy).toBeCalledTimes(1)
      expect(confirmedUser.emailConfirmationToken).toBe('')
      expect(confirmedUser.data.emailConfirmationToken).toBe('')
      expect(confirmedUser.data.emailConfirmationTokenExp).toBe(0)
      expect(confirmedUser.data.emailConfirmed).toBeTruthy()
    })

    it.skip('should NOT remove the token and set the confirmation token if the token is expired', async () => {
      const repoSpy = jest.spyOn(mockedRepo, 'updateOne')
      const confirmedUser: UserEntity = await service.confirmEmail(mockedUserExpiredToken.emailConfirmationToken)

      expect(confirmedUser).toBe(null)
      expect(repoSpy).toBeCalledTimes(0)
    })
  })

  describe('resetPassword', () => {
    it('should not change old password with new value with wrong token', async () => {
      const isChanged: boolean = await service.resetPassword('unknown', 'etiqa123@')
      expect(isChanged).toBeFalsy()
    })

    it('should change old password with new value', async () => {
      const isChanged: boolean = await service.resetPassword('xpSPApwqdaS@', 'etiqa123@')
      expect(isChanged).toBeTruthy()
    })

    it('should not change old password with new value with expired token', async () => {
      const isChanged: boolean = await service.resetPassword('anotherAnother@', 'etiqa123@')
      expect(isChanged).toBeFalsy()
    })

    it('should not change old password with null email', async () => {
      const isChanged: boolean = await service.resetPassword(null, 'etiqa123@')
      expect(isChanged).toBeFalsy()
    })

    it('should not change old password with null password', async () => {
      const isChanged: boolean = await service.resetPassword('unknown', null)
      expect(isChanged).toBeFalsy()
    })
  })
})
