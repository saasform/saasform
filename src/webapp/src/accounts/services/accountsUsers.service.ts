import { REQUEST } from '@nestjs/core'
import { Injectable, Scope, Inject } from '@nestjs/common'
import { QueryService } from '@nestjs-query/core'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { AccountUserEntity } from '../entities/accountUser.entity'
import { UsersService } from '../services/users.service'
import { UserEntity } from '../entities/user.entity'
import { AccountEntity } from '../entities/account.entity'
import { BaseService } from '../../utilities/base.service'

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
    const accountUsers = await this.query({
      filter: { account_id: { eq: account.id }, user_id: { eq: user.id } }
    })

    if (accountUsers.length !== 0) {
      return accountUsers[0]
    }

    const accountUser = new AccountUserEntity()

    accountUser.account_id = account.id
    accountUser.user_id = user.id

    try {
      return await this.createOne(accountUser)
    } catch (error) {
      console.error('accountsUser.service - addUser', error)
      return null
    }
  }

  async deleteUser (userId: number): Promise<number | null> {
    try {
      return (await this.deleteMany({ user_id: { eq: userId } })).deletedCount
    } catch (error) {
      console.error('AccountsUsersService - deleteUser - error while deleteMany', userId, error)
      return null
    }
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
