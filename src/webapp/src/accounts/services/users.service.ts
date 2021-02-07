import { REQUEST } from '@nestjs/core'
import { Injectable, Scope, Inject } from '@nestjs/common'
import { QueryService } from '@nestjs-query/core'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcrypt'

import { UserEntity } from '../entities/user.entity'
import { NewUserInput } from '../dto/new-user.input'
import { UserCredentialsService } from '../services/userCredentials.service'
import { BaseService } from '../../utilities/base.service'
@QueryService(UserEntity)
@Injectable({ scope: Scope.REQUEST })
export class UsersService extends BaseService<UserEntity> {
  constructor (
    @Inject(REQUEST) private readonly req,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly userCredentialsService: UserCredentialsService
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
      res.setValuesFromJson()

      await this.userCredentialsService.changePassword(user.email, password)
      return true
    } catch (err) {
      console.error('Error while confirming token', resetPasswordToken, err)
      return false
    }
  }
}
