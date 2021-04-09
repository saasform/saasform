import { Test, TestingModule } from '@nestjs/testing'
import { mockedUserCredentials, mockUserCredentialsEntity, mockValidationService } from '../test/testData'
import { TypeOrmQueryService } from '@nestjs-query/query-typeorm'
import { UserCredentialsService } from './userCredentials.service'
import { getRepositoryToken } from '@nestjs/typeorm'
import { UserCredentialsEntity } from '../entities/userCredentials.entity'
import { ValidationService } from '../../validator/validation.service'
import { Repository } from 'typeorm'

describe('UserCredentials', () => {
  let service
  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TypeOrmQueryService,
        UserCredentialsService,
        {
          provide: getRepositoryToken(UserCredentialsEntity),
          useValue: mockUserCredentialsEntity
        },
        {
          provide: ValidationService,
          useValue: mockValidationService
        }
      ]
    }).compile()
    service = await module.get(UserCredentialsService)
    service.usersCredentialsRepository = await module.get<Repository<UserCredentialsEntity>>(
      getRepositoryToken(UserCredentialsEntity)
    )

    // We must manually set the following because extending TypeOrmQueryService seems to break it
    Object.keys(mockUserCredentialsEntity).forEach(f => (service[f] = mockUserCredentialsEntity[f]))
    // Object.keys(mockedRepo).forEach(f => (service[f] = mockedRepo[f]))
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('findUserCredentialByEmail', () => {
    it('with a registered user, should return the expected user', async () => {
      service.validationService = {
        isNilOrEmpty: jest.fn().mockReturnValue(false)
      }
      const expUserCredential = await service.findUserCredentialByEmail('user@gmail.com')
      expect(expUserCredential).toBeDefined()
    })
    it('with unregistered user, should not return the expected user', async () => {
      service.validationService = {
        isNilOrEmpty: jest.fn().mockReturnValue(true)
      }
      const expUserCredential = await service.findUserCredentialByEmail('user@yahoo.com')
      expect(expUserCredential).toBeNull()
    })
    it('with undefined user, should not return the expected user', async () => {
      const expUserCredential = await service.findUserCredentialByEmail(undefined)
      expect(expUserCredential).toBeNull()
    })
    it('with null user, should not return the expected user', async () => {
      const expUserCredential = await service.findUserCredentialByEmail(null)
      expect(expUserCredential).toBeNull()
    })
  })

  describe('addUserCredentials', () => {
    it('with user', async () => {
      const expUser = await service.addUserCredentials({
        credential: 'tmp@gmail.com',
        userId: 1,
        json: {}
      })
      expect(expUser).toBeDefined()
    })
    it('with undefined user', async () => {
      const expUser = await service.addUserCredentials(undefined)
      expect(expUser).toBeNull()
    })
    it('with null user', async () => {
      const expUser = await service.addUserCredentials(null)
      expect(expUser).toBeNull()
    })
  })

  describe('isRegistered', () => {
    it('with valid password', async () => {
      const isRegistered = await service.isRegistered(mockedUserCredentials, 'password')
      expect(isRegistered).toBeTruthy()
    })
    it('with null password', async () => {
      const isRegistered = await service.isRegistered(null, 'password')
      expect(isRegistered).toBeFalsy()
    })
    it('with null stored password', async () => {
      const isRegistered = await service.isRegistered(mockedUserCredentials, null)
      expect(isRegistered).toBeFalsy()
    })
    it('with null paswords', async () => {
      const isRegistered = await service.isRegistered(null, null)
      expect(isRegistered).toBeFalsy()
    })
    it('with wrong password', async () => {
      const isSamePasswords = await service.isRegistered(mockedUserCredentials, 'password01')
      expect(isSamePasswords).toBeFalsy()
    })
  })

  describe('changePassword', () => {
    it('with registered credential and password', async () => {
      const expUser = await service.changePassword('user@gmail.com', 'password02')
      expect(expUser).toBeDefined()
    })
    it('with unregistered credential and password', async () => {
      const expUser = await service.changePassword('user003@gmail.com', 'password02')
      expect(expUser).toBeNull()
    })
    it('with undefined values', async () => {
      const expUser = await service.changePassword(undefined, 'password02')
      expect(expUser).toBeNull()
    })
  })

  describe('delete user credentials', () => {
    it('should delete all of the user credentials', async () => {
      const repoSpy = jest.spyOn(mockUserCredentialsEntity, 'deleteMany')
      const userId = 1

      const res = await service.deleteUserCredentials(userId)

      expect(repoSpy).toBeCalledTimes(1)
      expect(repoSpy).toBeCalledWith({ userId: { eq: userId } })
      expect(res).toBe(0) // the value 0 is hardcoded in the mock definition
    })
  })
})
