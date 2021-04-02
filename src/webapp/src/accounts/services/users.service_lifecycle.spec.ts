// import { REQUEST } from '@nestjs/core'
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { TypeOrmQueryService } from '@nestjs-query/query-typeorm'

import { UsersService } from './users.service'
import { UserEntity } from '../entities/user.entity'
import { mockedCommunicationService, mockedRandom, mockedRepo, mockedUser, mockedUserWithLargeProfile, mockUserCredentialsEntity, mockedSettingRepo } from '../test/testData'
import { UserCredentialsService } from './userCredentials.service'
import { UserCredentialsEntity } from '../entities/userCredentials.entity'
import { NotificationsService } from '../../notifications/notifications.service'
import { SettingsService } from '../../settings/settings.service'
import { PaymentsService } from '../../payments/services/payments.service'
import { PlansService } from '../../payments/services/plans.service'
import { ValidationService } from '../../validator/validation.service'
import { UserError } from '../../utilities/common.model'

const mockedUserCredentialsService = {
  ...mockUserCredentialsEntity,
  changePassword: jest.fn(),
  addUserCredentials: jest.fn(),
  deleteUserCredentials: jest.fn().mockReturnValue(true)
}

const mockValidationService = {
  isNilOrEmpty: jest.fn().mockReturnValue(true)
}

describe('UsersService Lifecycle', () => {
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

  describe('user creation', () => {
    it('should add the email', async () => {
      // the allowed keys are 'email' and 'unused'
      const repoSpy = jest.spyOn(mockedRepo, 'createOne')
      const userInput = {
        email: 'foo@email.com',
        password: 'password',
        username: 'username',
        data: { name: 'foo', email: 'foo@email.com' }
      }

      await service.addUser(userInput)

      const addedUser: UserEntity = repoSpy.mock.calls[0][0]
      expect(repoSpy).toBeCalledTimes(1)
      expect(addedUser.email).toBe(userInput.email)
    })

    it('should add the username if passed', async () => {
      // the allowed keys are 'email' and 'unused'
      const repoSpy = jest.spyOn(mockedRepo, 'createOne')
      const userInput = {
        email: 'foo@email.com',
        password: 'password',
        data: { username: 'username', name: 'foo', email: 'foo@email.com' }
      }

      await service.addUser(userInput)

      const addedUser: UserEntity = repoSpy.mock.calls[0][0]
      expect(repoSpy).toBeCalledTimes(1)
      expect(addedUser.username).toBe(userInput.data.username)
    })

    it('should not add the username if not passed', async () => {
      // the allowed keys are 'email' and 'unused'
      const repoSpy = jest.spyOn(mockedRepo, 'createOne')
      const userInput = {
        email: 'foo@email.com',
        password: 'password',
        data: { name: 'foo', email: 'foo@email.com' }
      }

      await service.addUser(userInput)

      const addedUser: UserEntity = repoSpy.mock.calls[0][0]
      expect(repoSpy).toBeCalledTimes(1)
      expect(addedUser.username).toBeUndefined()
    })

    it('should set additional data', async () => {
      // the allowed keys are 'email' and 'unused'
      const repoSpy = jest.spyOn(mockedRepo, 'createOne')
      const userInput = {
        email: 'foo@email.com',
        password: 'password',
        data: { name: 'foo', email: 'foo@email.com' }
      }

      await service.addUser(userInput)

      const addedUser: UserEntity = repoSpy.mock.calls[0][0]
      expect(repoSpy).toBeCalledTimes(1)
      expect(addedUser.data.profile.email).toBe(userInput.email)
      expect(addedUser.data.profile.name).toBeUndefined()
      expect(addedUser.data.profile.unused).toBeUndefined()
    })

    it('should add user credentials', async () => {
      const repoSpy = jest.spyOn(mockedUserCredentialsService, 'addUserCredentials')
      const userInput = {
        email: 'foo@email.com',
        password: 'password',
        data: { name: 'foo', email: 'foo@email.com' }
      }

      await service.addUser(userInput)

      const userCredential: any = repoSpy.mock.calls[0][0]
      expect(repoSpy).toBeCalledTimes(1)
      expect(userCredential?.credential).toBe(userInput.email)
      expect(userCredential.json.encryptedPassword).not.toBeUndefined()
      expect(userCredential.json.encryptedPassword).not.toBe(userInput.password)
    })

    it('should fail if duplicate email', async () => {
      service.query = jest.fn(q => q?.filter?.email?.eq === 'foo@email.com' ? [{ user: 'mockUser' }] : [])
      service.validationService = {
        isNilOrEmpty: jest.fn(e => e.length === 0)
      }
      const userInput = {
        email: 'foo@email.com',
        password: 'password',
        data: { name: 'foo', email: 'foo@email.com', username: 'foo' }
      }

      const res = await service.addUser(userInput)

      expect(res).toEqual(new UserError('duplicate_email', 'email already existing'))
    })

    it('should fail if duplicate username', async () => {
      service.query = jest.fn(q => q?.filter?.username?.eq === 'foo' ? [{ user: 'mockUser' }] : [])
      service.validationService = {
        isNilOrEmpty: jest.fn(e => e.length === 0)
      }
      const userInput = {
        email: 'foo@email.com',
        password: 'password',
        data: { name: 'foo', email: 'foo@email.com', username: 'foo' }
      }

      const res = await service.addUser(userInput)

      expect(res).toEqual(new UserError('duplicate_username', 'username already existing'))
    })
  })

  describe('user update', () => {
    it('should update the user data', async () => {
      // the allowed keys are 'email' and 'unused'
      const repoSpy = jest.spyOn(mockedRepo, 'updateOne')
      const userUpdate = {
        name: 'foo',
        email: 'foo@email.com'
      }

      await service.updateUserProfile(userUpdate, mockedUser.id)

      const expectedData = {
        data: {
          ...mockedUser.data,
          profile: {
            email: 'foo@email.com',
            unused: ''
          }
        }
      }

      expect(repoSpy).toBeCalledTimes(1)
      expect(repoSpy).toBeCalledWith(1, expectedData)
    })

    it('should keep the user data when not present in the updated data', async () => {
      // the allowed keys are 'email' and 'unused'
      const repoSpy = jest.spyOn(mockedRepo, 'updateOne')
      const userUpdate = {
        name: 'foo'
      }

      await service.updateUserProfile(userUpdate, mockedUserWithLargeProfile.id)

      const updatedUser: UserEntity = repoSpy.mock.calls[0][1]
      expect(updatedUser.data.profile.email).toBe(mockedUserWithLargeProfile.data.profile.email)
    })
  })

  describe('delete user', () => {
    it('should dete the user', async () => {
      const repoSpy = jest.spyOn(mockedRepo, 'deleteOne')

      const res = await service.deleteUser(1)

      expect(repoSpy).toBeCalledTimes(1)
      expect(repoSpy).toBeCalledWith(1)
      expect(res).toBeTruthy()
    })

    it('should delete all of the userCredentials', async () => {
      const repoSpy = jest.spyOn(mockedUserCredentialsService, 'deleteUserCredentials')

      const res = await service.deleteUser(1)

      expect(repoSpy).toBeCalledTimes(1)
      expect(repoSpy).toBeCalledWith(1)
      expect(res).toBeTruthy()
    })
  })
})
