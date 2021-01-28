import { REQUEST } from '@nestjs/core'
import { Injectable, Scope, Inject } from '@nestjs/common'
import { QueryService } from '@nestjs-query/core'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { AccountUserEntity } from '../entities/accountUser.entity'
import { UsersService } from '../services/users.service'
import { UserEntity } from '../entities/user.entity'
import { AccountEntity } from '../entities/account.entity'
import { BaseService } from 'src/utilities/base.service'

@QueryService(AccountUserEntity)
@Injectable({ scope: Scope.REQUEST })
export class AccountsUsersService extends BaseService<AccountUserEntity> {
  constructor (
    @Inject(REQUEST) private readonly req,
    @InjectRepository(AccountUserEntity)
    private readonly accountsUsersRepository: Repository<AccountUserEntity>,
    private readonly usersService: UsersService // private stripeClient: StripeClient,
  ) {
    super(
      req,
      'AccountUserEntity'
    )
  }

  /**
   * Get users associated with an account
   *
   * @param accountId id of the account
   */
  async getUsers (accountId: number): Promise<AccountUserEntity[]> {
    const users = await this.query({
      filter: { account_id: { eq: accountId } }
    })

    return users
  }

  /**
   * Add user to an account
   *
   * @param user data of the user
   * @param accountId id of the account
   */
  async addUser (user: UserEntity, account: AccountEntity): Promise<AccountUserEntity | null> {
    const accountUser = new AccountUserEntity()

    accountUser.account_id = account.id
    accountUser.user_id = user.id

    try {
      await this.createOne(accountUser)
    } catch (error) {
      console.error('accountsUser.service - addUser', error)
      return null
    }

    return accountUser
  }

  /**
   * Get user by email
   *
   * @param email email of the user to search
   */
  async findUserByEmail (email: string): Promise<UserEntity> {
    return await this.usersService.findByEmail(email)
  }
}
