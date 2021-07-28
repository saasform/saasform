import { UserEntity } from '../entities/user.entity'
import { UserCredentialsEntity } from '../entities/userCredentials.entity'

export const mockGenericRepo = {
  find: jest.fn(id => id !== 999 ? {} : undefined),
  findOne: jest.fn().mockReturnValue([{}]),
  query: jest.fn().mockReturnValue([{}]),
  createOne: jest.fn(entity => entity),
  updateOne: jest.fn((id, update) => ({ id, ...update })),
  deleteOne: jest.fn(id => ({})),
  deleteMany: jest.fn().mockReturnValue({ deletedCount: 0 })
}

export const mockAccountsUsersRepo = {
  ...mockGenericRepo,
  createOne: jest.fn(accountUser => accountUser)
}

export const mockJwtService = { ...mockGenericRepo }

export const mockAccountsService = { ...mockGenericRepo }

export const mockPlansService = { ...mockGenericRepo }

export const mockValidationService = {
  isNilOrEmpty: jest.fn().mockReturnValue(false)
}

export const mockedSettingRepo = {
  ...mockGenericRepo,
  getWebsiteRenderingVariables: jest.fn(_ => []),
  getUserSettings: jest.fn(_ => ({ allowedKeys: ['email', 'unused'] })),
  getSettings: jest.fn(
    category => {
      switch (category) {
        case 'user': return { allowedKeys: ['email', 'unused'] }
        default: return {}
      }
    }
  )
}

export const mockPaymentsService = {
  getPaymentsConfig: async () => ({}),
  refreshPaymentsFromStripe: async () => {},
  getActivePayments: async (accountId) => (null)
}

export const mockList = {
  settingsService: mockedSettingRepo,
  paymentsService: mockPaymentsService
}

// TODO: refactor below this point

export const mockedCommunicationService = {
  sendEmail: jest.fn(_ => [])
}

export const mockedUser: UserEntity = new UserEntity()
mockedUser.id = 1
mockedUser.email = 'user@gmail.com'
mockedUser.password = 'password'
mockedUser.emailConfirmationToken = 'okToken'
mockedUser.data.emailConfirmationTokenExp = new Date().getTime() + 10 * 1000 * 60 // putting expiration 10 minutes in the future
mockedUser.resetPasswordToken = 'xpSPApwqdaS@'
mockedUser.data.resetPasswordTokenExp = new Date().getTime() + 10 * 1000 * 60 // putting expiration 10 minutes in the future
mockedUser.data.resetPasswordToken = 'xpSPApwqdaS@' // putting expiration 10 minutes in the future

export const mockedUserExpiredToken: UserEntity = new UserEntity()
mockedUserExpiredToken.id = 2
mockedUser.password = 'password'
mockedUserExpiredToken.emailConfirmationToken = 'expiredToken'
mockedUserExpiredToken.data.emailConfirmationTokenExp = new Date().getTime() - 10 * 1000 * 60 // putting expiration 10 minutes in the past
mockedUserExpiredToken.resetPasswordToken = 'anotherAnother@'
mockedUserExpiredToken.data.resetPasswordTokenExp = new Date().getTime() - 10 * 1000 * 60
mockedUserExpiredToken.data.resetPasswordToken = 'anotherAnother@'

export const mockedUserWithLargeProfile: UserEntity = new UserEntity()
mockedUserWithLargeProfile.id = 3
mockedUserWithLargeProfile.email = 'user@gmail.com'
mockedUserWithLargeProfile.password = 'password'
mockedUserWithLargeProfile.emailConfirmationToken = 'okToken'
mockedUserWithLargeProfile.data.profile = { foo: 'foo', email: 'internal@email' }

export const mockedRepo = {
  find: jest.fn(_ => []),
  findUser: jest.fn((id) => {
    switch (id) {
      case mockedUser.id: return mockedUser
      case mockedUserWithLargeProfile.id: return mockedUserWithLargeProfile
      default: return undefined
    }
  }),
  findById: jest.fn((id) => {
    switch (id) {
      case mockedUser.id: return mockedUser
      case mockedUserWithLargeProfile.id: return mockedUserWithLargeProfile
      default: return undefined
    }
  }),
  createOne: jest.fn((user: UserEntity) => user),
  findByEmail: jest.fn((email) => email === mockedUser.email ? mockedUser : undefined),
  updateOne: jest.fn((id, user: UserEntity) => Object.assign(new UserEntity(), user)),
  deleteOne: jest.fn(id => ({})),
  query: jest.fn(query => {
    const res = [mockedUser, mockedUserExpiredToken].filter(u => {
      if (u.emailConfirmationToken === query?.filter?.emailConfirmationToken?.eq) {
        return true
      }
      if (u.resetPasswordToken === query?.filter?.resetPasswordToken?.eq) {
        return true
      }
      return false
    })
    return res
  })
}

export const mockedUserCredentials = new UserCredentialsEntity('user@gmail.com', 1, { encryptedPassword: '$2b$12$lQHyC/s1tdH1kTwrayYyUOISPteINC5zbHL2eWL6On7fMtIgwYdNm' })

export const mockUserCredentialsEntity = {
  find: jest.fn(({ where: { userId } }) => userId === mockedUserCredentials.userId ? mockedUserCredentials : undefined),
  findOne: jest.fn(({ where: { email } }) => email === mockedUserCredentials.credential ? mockedUserCredentials : undefined),
  createOne: jest.fn((userCredential) => userCredential),
  updateOne: jest.fn((id) => id === mockedUserCredentials.id ? mockedUserCredentials : undefined),
  deleteMany: jest.fn(filter => ({ deletedCount: 0 })),
  query: jest.fn(query => {
    const res = [mockedUserCredentials].filter(u => ((u.credential === query?.filter?.credential?.eq)) ?? undefined)
    return res
  })
}

export const mockedRandom = {
  password: _ => 'password'
}

export const mockUserCredentialsService = {
  findUserCredentialByEmail: jest.fn((email) => email === mockedUserCredentials.credential ? mockedUserCredentials : undefined),
  isRegistered: jest.fn((userCredentials, password) => userCredentials.credential === mockedUserCredentials.credential && password === 'password' ? mockedUserCredentials : undefined)
}
