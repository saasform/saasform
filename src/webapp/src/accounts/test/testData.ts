import { UserEntity } from '../entities/user.entity'
import { UserCredentialsEntity } from '../entities/userCredentials.entity'

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

export const mockedRepo = {
  find: jest.fn(_ => []),
  findById: jest.fn((id) => id === mockedUser.id ? mockedUser : undefined),
  createOne: jest.fn((user: UserEntity) => user),
  findByEmail: jest.fn((email) => email === mockedUser.email ? mockedUser : undefined),
  updateOne: jest.fn((id, user: UserEntity) => Object.assign(new UserEntity(), user)),
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

// encrypted_password === 'password'
export const mockedUserCredentials = new UserCredentialsEntity('user@gmail.com', 1, { encryptedPassword: '$2b$12$lQHyC/s1tdH1kTwrayYyUOISPteINC5zbHL2eWL6On7fMtIgwYdNm' })

export const mockUserCredentialsEntity = {
  // changePassword: jest.fn(),
  find: jest.fn(({ where: { userId } }) => userId === mockedUserCredentials.userId ? mockedUserCredentials : undefined),
  findOne: jest.fn(({ where: { credential } }) => credential === mockedUserCredentials.credential ? mockedUserCredentials : undefined),
  createOne: jest.fn((userCredential) => userCredential),
  updateOne: jest.fn((id) => id === mockedUserCredentials.id ? mockedUserCredentials : undefined),
  query: jest.fn(query => {
    const res = [mockedUserCredentials].filter(u => u.credential === query?.filter?.credential?.eq ?? undefined)
    return res
  })
}

export const mockedCommunicationService = {
  sendEmail: jest.fn(_ => [])
}
export const mockedSettingRepo = {
  getWebsiteRenderingVariables: jest.fn(_ => [])
}
export const mockedRandom = {
  password: _ => 'password'
}

export const mockUserCredentialsService = {
  findUserCredentials: jest.fn((email) => email === mockedUserCredentials.credential ? mockedUserCredentials : undefined),
  isRegistered: jest.fn((userCredentials, password) => userCredentials.credential === mockedUserCredentials.credential && password === 'password' ? mockedUserCredentials : undefined)
}
