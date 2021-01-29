import { REQUEST } from '@nestjs/core'
import { Injectable, Scope, Inject } from '@nestjs/common'
import { QueryService } from '@nestjs-query/core'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcrypt'

import { UserEntity } from '../entities/user.entity'
import { NewUserInput } from '../dto/new-user.input'
// import { AccountEntity } from '../account/account.entity'
// import { SettingsService } from '../settings/settings.service'

// import { CommunicationService } from '../communication/communication.service'
// import config from '../../utilities/config'
import { UserCredentialsService } from '../services/userCredentials.service'
import { BaseService } from '../../utilities/base.service'
@QueryService(UserEntity)
@Injectable({ scope: Scope.REQUEST })
export class UsersService extends BaseService<UserEntity> {
  constructor (
    @Inject(REQUEST) private readonly req,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    // private readonly settingsService: SettingsService,
    // private readonly communicationService: CommunicationService,
    private readonly userCredentialsService: UserCredentialsService
  ) {
    // super(getRepository(UserEntity, req.req ? req.req.tenantId : req.tenantId))
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
    if (typeof result === 'undefined') {
      return null
    }

    return result
  }

  async findOrCreateUser (email: string): Promise<UserEntity | null> {
    let user
    user = await this.findByEmail(email)

    if (user === null || user === []) {
      return null
    }

    user = new UserEntity()
    user.email = email
    await user.setResetPasswordToken()

    try {
      user = await this.addUser(user)
      if (typeof user === 'undefined') {
        return null
      }

      return user
    } catch (err) {
      console.error(
        'accounts.service - inviteUser - Error while inviting new user (creating new user)',
        email,
        err
      )
      return null
    }
  }

  async addUser (newUser: NewUserInput): Promise<UserEntity | null> {
    const user = new UserEntity()
    user.email = newUser.email
    user.password = await bcrypt.hash(newUser.password, 12)
    user.data.name = newUser?.data?.name ?? ''

    // await this.prepareConfirmEmail(user)

    try {
      const res = await this.createOne(user)
      await this.userCredentialsService.addUserCredentials({
        credential: user.email,
        userId: res.id,
        json: { encryptedPassword: user.password }
      })
      return res
    } catch (err) {
      console.error('Error while inserting new user', newUser, err)
      return null
    }
  }

  /**
   * Set up things for email confirmation
   * 1. create confirmation token
   * 2. send email
   *
   * @param user to be confirmed
   */
  /*
  async prepareConfirmEmail (user: UserEntity) {
    user.setConfirmationEmailToken()

    const settings = await this.settingsService.getWebsiteRenderingVariables()
    if (config.__IS_DEV__) {
      settings.domain_primary = 'http://ekjoy.com:8080'
    }
    const link = `${settings.domain_primary}/confirm-email/${user.data.emailConfirmationToken}`
    this.communicationService.sendEmail(user.email, 'confirmation', { settings: { ...settings }, user: { ...user }, link })
  }

  async confirmEmail (token: string): Promise<UserEntity> {
    const user = (
      await this.query({ filter: { emailConfirmationToken: { eq: token } } })
    )[0]

    if (!user) {
      console.error('confirmEmail - User not found', token)
      return null
    }

    const now = new Date().getTime()
    if (user.data.emailConfirmationTokenExp < now) {
      console.error('confirmEmail - Token expired', token, user.data.emailConfirmationTokenExp, now)
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
  */

  /*
  async sendResetPasswordEmail (email: string): Promise<void> {
    const user = await this.findByEmail(email)
    if (user) {
      user.setResetPasswordToken()
      const settings = await this.settingsService.getWebsiteRenderingVariables()
      if (config.__IS_DEV__) {
        settings.domain_primary = 'http://ekjoy.com:8080'
      }
      const link = `${settings.domain_primary}/reset-password/${user.data.resetPasswordToken}`
      await this.updateOne(user.id, { resetPasswordToken: user.data.resetPasswordToken, data: { ...user.data } })
      this.communicationService.sendEmail(email, 'resetPassword', { settings: { ...settings }, user: { ...user }, link })
    }
  }
  */

  async resetPassword (resetPasswordToken: string, password: string): Promise<boolean> {
    const user = (
      await this.query({ filter: { resetPasswordToken: { eq: resetPasswordToken } } })
    )[0]
    const now = new Date().getTime()
    if (typeof user === 'undefined') {
      console.error('resetPassword - User not found', resetPasswordToken)
      return false
    }
    if (user.data.resetPasswordTokenExp < now) {
      console.error('resetPassword - Token expired', resetPasswordToken, user.data.resetPasswordTokenExp, now)
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
      res.setValuesFromJson()

      await this.userCredentialsService.changePassword(user.email, password)
      return true
    } catch (err) {
      console.error('Error while confirming token', resetPasswordToken, err)
      return false
    }
  }
}
