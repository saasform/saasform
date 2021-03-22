import { REQUEST } from '@nestjs/core'
import { Injectable, Scope, Inject } from '@nestjs/common'
import { QueryService } from '@nestjs-query/core'
// import { TypeOrmQueryService } from '@nestjs-query/query-typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CredentialType, UserCredentialsEntity } from '../entities/userCredentials.entity'
import * as bcrypt from 'bcrypt'
import { BaseService } from '../../utilities/base.service'

@QueryService(UserCredentialsEntity)
@Injectable({ scope: Scope.REQUEST })
export class UserCredentialsService extends BaseService<UserCredentialsEntity> {
  constructor (
    @Inject(REQUEST) private readonly req,
    @InjectRepository(UserCredentialsEntity) private readonly usersCredentialsRepository: Repository<UserCredentialsEntity>
  ) {
    super(req, 'UserCredentialsEntity')
  }

  async findUserCredentialByEmail (email: string, credential: CredentialType = CredentialType.DEFAULT): Promise<UserCredentialsEntity | null> {
    if (!email) {
      console.error('userCredentials.service - findUserCredentialByEmail - parameter error')
      return null
    }

    const res = await this.query({ filter: { email: { eq: email }, credential: { eq: credential }}});
    return res[0] ?? null
  }

  isRegistered (userCredentials: UserCredentialsEntity, password: string): boolean {
    if (userCredentials == null || password == null) {
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
          userCredentials.email,
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

  async changePassword (credential: string, password: string): Promise<UserCredentialsEntity | null> {
    if (credential === null || password === null) {
      return null
    }

    const userCredentials = await this.query({ filter: { credential: { eq: credential } } })
    if (userCredentials === null || userCredentials === []) {
      return null
    }

    const encryptedPassword: string = await bcrypt.hash(password, 12)
    try {
      return await this.updateOne(userCredentials[0].id, { json: { encryptedPassword } })
    } catch (error) {
      console.error('userCredentials.service - changePassword', credential, error)
      return null
    }
  }

  compare (password: string, encryptedPassword: string): boolean {
    return bcrypt.compare(password, encryptedPassword)
  }
};
