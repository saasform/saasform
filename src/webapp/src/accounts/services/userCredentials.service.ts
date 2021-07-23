import { REQUEST } from '@nestjs/core'
import { Injectable, Scope, Inject } from '@nestjs/common'
import { QueryService } from '@nestjs-query/core'
// import { TypeOrmQueryService } from '@nestjs-query/query-typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CredentialType, UserCredentialsEntity } from '../entities/userCredentials.entity'
import * as bcrypt from 'bcrypt'
import { BaseService } from '../../utilities/base.service'
import { ValidationService } from '../../validator/validation.service'

@QueryService(UserCredentialsEntity)
@Injectable({ scope: Scope.REQUEST })
export class UserCredentialsService extends BaseService<UserCredentialsEntity> {
  constructor (
    @Inject(REQUEST) private readonly req,
    @InjectRepository(UserCredentialsEntity) private readonly usersCredentialsRepository: Repository<UserCredentialsEntity>,
    private readonly validationService: ValidationService
  ) {
    super(req, 'UserCredentialsEntity')
  }

  async findUserCredentialByUserId (userId: number): Promise<UserCredentialsEntity | null> {
    if (userId == null) {
      console.error('userCredentials.service - findUserCredentialByUserId - parameter error')
      return null
    }

    const res = await this.query({ filter: { userId: { eq: userId } } })

    if (this.validationService.isNilOrEmpty(res) === true) {
      console.error('userCredentials.service - findUserCredentialByUserId - userCredential not found', userId)
      return null
    }

    return res[0]
  }

  async findUserCredentialByEmail (email: string, credentialType: CredentialType = CredentialType.DEFAULT): Promise<UserCredentialsEntity | null> {
    if (email == null) {
      console.error('userCredentials.service - findUserCredentialByEmail - parameter error')
      return null
    }

    const res = await this.query({ filter: { /* email: { eq: email }/*, */ credential: { eq: email } } })

    if (this.validationService.isNilOrEmpty(res) === true) {
      console.error('userCredentials.service - findUserCredentialByEmail - userCredential not found', email, credentialType)
      return null
    }

    return res[0]
  }

  isRegistered (userCredentials: UserCredentialsEntity, password: string): boolean {
    if (userCredentials == null || password == null || password === '') {
      return false
    }

    return this.compare(password, userCredentials?.json?.encryptedPassword ?? '')
  }

  async addUserCredentials (userCredentials: any): Promise<UserCredentialsEntity | null> {
    if (userCredentials === null) {
      return null
    }

    try {
      return await this.createOne(
        new UserCredentialsEntity(
          userCredentials.credential,
          userCredentials.userId,
          userCredentials.json
        )
      )
    } catch (error) {
      console.error('userCredentials.service - addUserCredentials - Error while inserting new user', error)
      return null
    }
  }

  /**
   * Deprecated ?
   */
  /*
  async attachUserCredentials (email: string, credential: any, credentialType: CredentialType = CredentialType.DEFAULT): Promise<UserCredentialsEntity | null> {
    if (email === null) {
      return null
    }

    const userCredential = await this.findUserCredentialByEmail(email)

    if (this.validationService.isNilOrEmpty(userCredential) === true) {
      console.error('userCredentials.service - attachUserCredentials')
      return null
    }

    const json = userCredential?.json ?? {}

    switch (credentialType) {
      case CredentialType.DEFAULT:
        json.encryptedPassword = credential
        break
      case CredentialType.GOOGLE:
        json.googleId = credential
        break
    }

    try {
      return await this.updateOne(userCredential?.id ?? -1,
        { json }
      )
    } catch (error) {
      console.error('userCredentials.service - attachUserCredentials - Error while inserting new user', error)
      return null
    }
  }
  */

  async deleteUserCredentials (userId: number): Promise<number | null> {
    try {
      return (await this.deleteMany({ userId: { eq: userId } })).deletedCount
    } catch (error) {
      console.error('UserCredentialsService - deleteUserCredentials - error while deleteMany', userId, error)
      return null
    }
  }

  /**
   * Change password for a given user identified by an email
   * @param email the email of the user to change password
   * @param password the new password
   * @returns the updated userCredential
   */
  async changePassword (email: string, password: string): Promise<UserCredentialsEntity | null> {
    if (email === null || password === null) {
      return null
    }

    const userCredentials = await this.query({ filter: { credential: { eq: email } } })
    if (userCredentials === null || userCredentials === []) {
      return null
    }

    const encryptedPassword: string = await bcrypt.hash(password, 12)
    try {
      return await this.updateOne(userCredentials[0].id, { json: { encryptedPassword } })
    } catch (error) {
      console.error('userCredentials.service - changePassword', email, error)
      return null
    }
  }

  compare (password: string, encryptedPassword: string): boolean {
    return bcrypt.compare(password, encryptedPassword)
  }
};
