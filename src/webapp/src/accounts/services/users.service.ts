import { REQUEST } from '@nestjs/core'
import { Injectable, Scope, Inject } from '@nestjs/common'
import { QueryService } from '@nestjs-query/core'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcrypt'

import { UserEntity } from '../entities/user.entity'
import { UserJson } from '../dto/new-user.input'
import { UserCredentialsService } from '../services/userCredentials.service'
import { BaseService } from '../../utilities/base.service'
import { SettingsService } from '../../settings/settings.service'
import { NotificationsService } from '../../notifications/notifications.service'

import { UserError, ErrorTypes } from '../../utilities/common.model'

import { password } from '../../utilities/random'
import { ValidationService } from '../../validator/validation.service'

@QueryService(UserEntity)
@Injectable({ scope: Scope.REQUEST })
export class UsersService extends BaseService<UserEntity> {
  constructor (
    @Inject(REQUEST) private readonly req,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly userCredentialsService: UserCredentialsService,
    private readonly settingsService: SettingsService,
    private readonly notificationService: NotificationsService,
    private readonly validationService: ValidationService
  ) {
    super(
      req,
      'UserEntity'
    )
  }

  async findByEmail (email: string): Promise<UserEntity> {
    const result = await this.query({ filter: { email: { eq: email } } })
    return result[0]
  }

  async findUser (id: number): Promise<UserEntity | null> {
    const result = await this.findById(id)
    if (result == null) {
      return null
    }

    return result
  }

  /**
   * If a user exists on the DB reutrns it.
   * It it doesn't, creates it.
   * If data is passed, assign data to the user data.
   * @param email emaiil of the user
   * @param data additional data of the user
   */
  async findOrCreateUser (data: UserJson): Promise<UserEntity | null> {
    const user = await this.findByEmail(data.email)

    if (user != null) {
      return user
    }

    try {
      const user = await this.addUser({
        email: data.email,
        password: password(10),
        data
      }, true)
      if (!(user instanceof UserEntity)) {
        return null
      }

      return user
    } catch (err) {
      console.error(
        'usersService - findOrCreateUser - Error while adding new user',
        data.email,
        err
      )
      return null
    }
  }

  /**
   * Add a new user
   * @param newUser data of the user
   * @param resetPassword flag indicating if password must be resetted during creation. Default to false (see below)
   */
  async addUser (newUser: any, resetPassword = false): Promise<UserEntity | UserError | null> {
    const sameEmailUser = await this.query({ filter: { email: { eq: newUser.email } } })
    if (this.validationService.isNilOrEmpty(sameEmailUser) !== true) {
      console.error('usersService - addUser - email already existing')
      return new UserError(ErrorTypes.DUPLICATE_EMAIL, 'email already existing')
    }

    const sameUsernameUser = await this.query({ filter: { username: { eq: newUser.data.username } } })
    if (this.validationService.isNilOrEmpty(sameUsernameUser) !== true) {
      console.error('usersService - addUser - username already existing')
      return new UserError(ErrorTypes.DUPLICATE_USERNAME, 'username already existing')
    }

    const user = new UserEntity()
    user.email = newUser.email
    user.username = newUser.data.username != null && newUser.data.username !== '' ? newUser.data.username : undefined
    user.password = (newUser.password != null) ? await bcrypt.hash(newUser.password, 12) : ''
    for (const key in newUser.data) {
      user.data[key] = newUser.data[key]
    }
    const { allowedKeys } = await this.settingsService.getUserSettings()
    allowedKeys.forEach(
      key => {
        if (key in newUser.data) {
          const castedKey: string = key
          user.data.profile[castedKey] = newUser.data[key]
        }
      }
    )

    // TODO: consider whether to move this elsewhere.
    // So far this flag is only set to true during the invitation,
    // while this function is also used during the signup, so maybe
    // it's better to move the password reset into the invitation flow;
    // it was put here to save a DB update.
    if (resetPassword) {
      await user.setResetPasswordToken()
    }

    try {
      const res = await this.createOne(user)
      await this.userCredentialsService.addUserCredentials({
        credential: user.email,
        userId: res.id,
        json: { encryptedPassword: user.password }
      })
      return res
    } catch (err) {
      console.error('Error while inserting new user', err)
      return null
    }
  }

  async updateUserProfile (data: any, userId: number): Promise<any> {
    const user = await this.findById(userId)
    if (user == null) {
      console.error('usersService - updateUserProfile - User not found', userId)
      return null
    }

    // Get allowedKeys and update those values
    const { allowedKeys } = await this.settingsService.getUserSettings()

    const updatedProfile = {}
    for (let k = 0; k < allowedKeys.length; k++) {
      const property = allowedKeys[k]

      if (property in data) {
        updatedProfile[property] = data[property]
      } else if (user?.data?.profile != null && property in user.data.profile) {
        updatedProfile[property] = user.data.profile[property]
      } else {
        updatedProfile[property] = ''
      }
    }

    user.data.profile = updatedProfile

    try {
      const res = await this.updateOne(userId, {
        data: user.data
      })

      res.setValuesFromJson()
      return res
    } catch (err) {
      console.error('Error while updating user profile', err)
      return null
    }
  }

  async deleteUser (userId: number): Promise<Boolean> {
    const user = this.findById(userId)
    if (user == null) {
      console.error('usersService - deleteUser - user not found', userId)
      return false
    }

    if (await this.userCredentialsService.deleteUserCredentials(userId) == null) {
      console.error('usersService - deleteUser - error while removing user credentials', userId)
      return false
    }

    try {
      const deletedUser = await this.deleteOne(userId)

      if (deletedUser == null) {
        console.error('usersService - deleteUser - error while removing user', userId)
        return false
      }

      return true
    } catch (error) {
      console.error('usersService - deleteUser - exception  while removing user', userId, error)
      return false
    }
  }

  async confirmEmail (token: string): Promise<UserEntity | null> {
    if (token === '') {
      console.error('confirmEmail - error in parameters')
    }

    const user = (
      await this.query({ filter: { emailConfirmationToken: { eq: token } } })
    )[0]

    if (user == null) {
      console.error('confirmEmail - User not found')
      return null
    }

    const now = new Date().getTime()
    if (user.data.emailConfirmationTokenExp < now) {
      console.error('confirmEmail - Token expired', user.data.emailConfirmationTokenExp, now)
      return null
    }

    try {
      const res = await this.updateOne(user.id, {
        emailConfirmationToken: '',
        data: {
          emailConfirmationToken: '',
          emailConfirmationTokenExp: 0,
          emailConfirmed: true
        }
      })

      // not auto called after updateOne :(
      res.setValuesFromJson()
      return res
    } catch (err) {
      console.error('Error while confirming token', token, err)
      return null
    }
  }

  async sendResetPasswordEmail (email: string): Promise<any> {
    const user = await this.findByEmail(email)
    if (user == null) {
      console.error('userService - sendResetPasswordEmail - user not found', email)
      return null
    }

    await user.setResetPasswordToken()

    const emailData = {
      user,
      action_url: `${await this.settingsService.getBaseUrl()}/password-change/${user.resetPasswordToken}`
    }
    await this.updateOne(user.id, { resetPasswordToken: user.data.resetPasswordToken, data: { ...user.data } })
    if (await this.notificationService.sendEmail(email, 'password_reset', emailData) === false) {
      console.error('userService - sendResetPasswordEmail - error while sending email')
    }
  }

  async resetPassword (resetPasswordToken: string, password: string): Promise<boolean> {
    const user = (
      await this.query({ filter: { resetPasswordToken: { eq: resetPasswordToken } } })
    )[0]
    const now = new Date().getTime()
    if (typeof user === 'undefined') {
      console.error('resetPassword - User not found')
      return false
    }
    if (user.data.resetPasswordTokenExp < now) {
      console.error('resetPassword - Token expired for user', user.id)
      return false
    }

    if (password === '' || user.data.resetPasswordToken !== resetPasswordToken) {
      return false
    }

    try {
      const newHashPassword = await bcrypt.hash(password, 12)
      const res = await this.updateOne(user.id, {
        resetPasswordToken: '',
        password: newHashPassword,
        data: {
          resetPasswordToken: '',
          resetPasswordTokenExp: 0
        }
      })
      res.setValuesFromJson() // TODO: do we need this?

      await this.userCredentialsService.changePassword(user.email, password)
      return true
    } catch (err) {
      console.error('Error while confirming token', resetPasswordToken, err)
      return false
    }
  }

  async changePassword (email: string, password: string, newpassword: string): Promise<boolean> {
    const userCredential = await this.userCredentialsService.findUserCredentialByEmail(email)
    if (userCredential == null) {
      console.error('userService - changePassword - userCredential not found')
      return false
    }

    const isRegistered = await this.userCredentialsService.isRegistered(userCredential, password)

    if (!isRegistered) {
      console.error('userService - changePassword - password not match')
      return false
    }

    try {
      await this.userCredentialsService.changePassword(email, newpassword)
      return true
    } catch (err) {
      console.error('userService - changePassword - error while changing password', err)
      return false
    }
  }
}
