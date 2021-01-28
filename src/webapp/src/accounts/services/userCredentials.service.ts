import { REQUEST } from '@nestjs/core'
import { Injectable, Scope, Inject } from '@nestjs/common'
import { QueryService } from '@nestjs-query/core'
import { TypeOrmQueryService } from '@nestjs-query/query-typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, getRepository } from 'typeorm'
import { UserCredentialsEntity } from '../entities/userCredentials.entity'
import * as bcrypt from 'bcrypt'

@QueryService(UserCredentialsEntity)
@Injectable({ scope: Scope.REQUEST })
export class UserCredentialsService extends TypeOrmQueryService<UserCredentialsEntity> {
  constructor (
    @Inject(REQUEST) private readonly req,
    @InjectRepository(UserCredentialsEntity) private readonly usersCredentialsRepository: Repository<UserCredentialsEntity>
  ) {
    // super(getRepository(UserCredentialsEntity, req.req ? req.req.tenantId : req.tenantId))
    super(
      req !== undefined && req !== null
        ? getRepository(
          UserCredentialsEntity,
          req?.req.tenantId ?? req.tenantId
        )
        : getRepository(UserCredentialsEntity)
    )
  }

  async findUserCredentials (credential: string): Promise<UserCredentialsEntity | null> {
    if (credential === null) {
      return null
    }

    const res = await this.query({ filter: { credential: { eq: credential } } })
    return res[0] ?? null
  }

  isRegistered (userCredentials: UserCredentialsEntity, password: string): boolean {
    if (userCredentials === null || password === null) {
      return false
    }

    return this.compare(password, userCredentials?.json?.encryptedPassword ?? '')
  }

  async addUserCredentials (userCredentials: any): Promise<UserCredentialsEntity | null> { // TODO: specify type
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
      console.error('userCredentials.service - addUserCredentials - Error while inserting new user', userCredentials, error)
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
      console.error('userCredentials.service - changePassword', credential, password, error)
      return null
    }
  }

  compare (password: string, encryptedPassword: string): boolean {
    return bcrypt.compare(password, encryptedPassword)
  }
};
