// import { REQUEST } from '@nestjs/core'
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { TypeOrmQueryService } from '@nestjs-query/query-typeorm'

import { UsersService } from './users.service'
import { UserEntity } from '../entities/user.entity'
import { NewUserInput } from '../dto/new-user.input'
import { mockedCommunicationService, mockedRandom, mockedRepo, mockedUser, mockedUserExpiredToken, mockUserCredentialsEntity, mockedSettingRepo } from '../test/testData'
import { UserCredentialsService } from '../services/userCredentials.service'
import { UserCredentialsEntity } from '../entities/userCredentials.entity'
import { NotificationsService } from '../../notifications/notifications.service'
import { SettingsService } from '../../settings/settings.service'
import { PaymentsService } from '../../payments/services/payments.service'
import { PlansService } from '../../payments/services/plans.service'
import { ValidationService } from '../../validator/validation.service'

const mockedUserCredentialsService = {
  ...mockUserCredentialsEntity,
  changePassword: jest.fn(),
  addUserCredentials: jest.fn(),
  findUserCredentialByEmail: jest.fn(email => email === 'user@email.com' ? email : null),
  isRegistered: jest.fn((credential, password) => credential === 'user@email.com' && password === 'password')
}

const mockValidationService = {
  isNilOrEmpty: jest.fn().mockReturnValue(true)
}

describe('UsersService', () => {
  let service // Removed type AccountsService because we must overwrite the accountsRepository property
  let repo: Repository<UserEntity>

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockedRepo
        },
        UserCredentialsService,
        {
          provide: getRepositoryToken(UserCredentialsEntity),
          useValue: mockedUserCredentialsService
        },
        {
          provide: NotificationsService,
          useValue: { sendEmail: jest.fn((to, template, data) => true) }
        },
        {
          provide: SettingsService,
          useValue: mockedSettingRepo
        },
        {
          provide: PaymentsService,
          useValue: {}
        },
        {
          provide: PlansService,
          useValue: {}
        },
        {
          provide: ValidationService,
          useValue: mockValidationService
        },
        // We must also pass TypeOrmQueryService
        TypeOrmQueryService
      ]
    }).compile()

    service = await module.get(UsersService)
    repo = await module.get<Repository<UserEntity>>(
      getRepositoryToken(UserEntity)
    )

    // We must manually set the following because extending TypeOrmQueryService seems to break it
    Object.keys(mockedRepo).forEach(f => (service[f] = mockedRepo[f]))
    service.accountsRepository = repo
    service.userCredentialsService = mockedUserCredentialsService
    service.communicationService = mockedCommunicationService
    service.settingsService = mockedSettingRepo
    service.validationService = mockValidationService
    service.random = { ...mockedRandom }
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
    expect(service.accountsRepository).toEqual(repo)
  })

  describe('Email confirmation', () => {
    it('should set the email confirmation token and flag when a user is created', async () => {
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

    it('should not set the email confirmation token and flag when a user is created', async () => {
      const repoSpy = jest.spyOn(mockedRepo, 'createOne')
      const userInput: NewUserInput = new NewUserInput()
      userInput.email = 'foo@email.com'
      userInput.password = 'password'
      userInput.data = { name: 'foo', email: 'foo@email.com', emailConfirmed: true }

      await service.addUser(userInput)

      const addedUser: UserEntity = repoSpy.mock.calls[0][0]
      expect(repoSpy).toBeCalledTimes(1)
      // expect(addedUser.data.emailConfirmationToken).toBeNull()
      // expect(addedUser.emailConfirmationToken).toBeNull()
      // expect(addedUser.data.emailConfirmationTokenExp).toBeNull()

      expect(addedUser.data.emailConfirmed).toBeTruthy()
    })

    it('should send the confirmation email', async () => {
    })

    it('should remove the token and set the confirmation token ', async () => {
      const repoSpy = jest.spyOn(mockedRepo, 'updateOne')
      const confirmedUser: UserEntity = await service.confirmEmail(mockedUser.emailConfirmationToken)

      expect(repoSpy).toBeCalledTimes(1)
      expect(confirmedUser.emailConfirmationToken).toBe('')
      expect(confirmedUser.data.emailConfirmationToken).toBe('')
      expect(confirmedUser.data.emailConfirmationTokenExp).toBe(0)
      expect(confirmedUser.data.emailConfirmed).toBeTruthy()
    })

    it('should NOT remove the token and set the confirmation token if the token is expired', async () => {
      const repoSpy = jest.spyOn(mockedRepo, 'updateOne')
      const confirmedUser: UserEntity = await service.confirmEmail(mockedUserExpiredToken.emailConfirmationToken)

      expect(confirmedUser).toBe(null)
      expect(repoSpy).toBeCalledTimes(0)
    })
  })

  describe('resetPassword', () => {
    it('should not change old password with new value with wrong token', async () => {
      const isChanged: boolean = await service.resetPassword('unknown', 'qqwqe123@')
      expect(isChanged).toBeFalsy()
    })

    it('should change old password with new value', async () => {
      const isChanged: boolean = await service.resetPassword('xpSPApwqdaS@', 'qqwqe123@')
      expect(isChanged).toBeTruthy()
    })

    it('should not change old password with new value with expired token', async () => {
      const isChanged: boolean = await service.resetPassword('anotherAnother@', 'qqwqe123@')
      expect(isChanged).toBeFalsy()
    })

    it('should not change old password with null email', async () => {
      const isChanged: boolean = await service.resetPassword(null, 'qqwqe123@')
      expect(isChanged).toBeFalsy()
    })

    it('should not change old password with null password', async () => {
      const isChanged: boolean = await service.resetPassword('unknown', null)
      expect(isChanged).toBeFalsy()
    })
  })

  describe('changePassword', () => {
    it('should not change password with unknown user', async () => {
      const isChanged: boolean = await service.changePassword('unknown', 'password', 'password')
      expect(isChanged).toBeFalsy()
    })

    it('should not change password with wrong password', async () => {
      const isChanged: boolean = await service.changePassword('user@test', 'password1', 'password2')
      expect(isChanged).toBeFalsy()
    })

    it('should change password with correct password', async () => {
      const repoSpy = jest.spyOn(mockedUserCredentialsService, 'changePassword')

      const isChanged: boolean = await service.changePassword('user@email.com', 'password', 'password2')
      expect(isChanged).toBeTruthy()
      expect(repoSpy).toBeCalledWith('user@email.com', 'password2')
    })
  })
})
