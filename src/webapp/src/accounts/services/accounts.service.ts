import { REQUEST } from '@nestjs/core'
import { Injectable, Inject } from '@nestjs/common'
import { QueryService } from '@nestjs-query/core'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { AccountEntity, AccountData } from '../entities/account.entity'

import { UsersService } from './users.service'
import { UserEntity } from '../entities/user.entity'
// import { NewUserInput } from '../dto/new-user.input' // TODO
import { AccountsUsersService } from './accountsUsers.service'
import { BaseService } from 'src/utilities/base.service'
// import { PaymentsService } from '../paymentModule/payments.service';
// import { PlansService } from '../plans/plans.service';

// import { stripe, createStripeFreeSubscription } from '../utility/stripe';
// import { PlanEntity } from '../plans/plan.entity';

@QueryService(AccountEntity)
@Injectable()
export class AccountsService extends BaseService<AccountEntity> {
  // Why we cannot inject this??
  // private stripeClient;

  constructor (
    @Inject(REQUEST) private readonly req: any,
    @InjectRepository(AccountEntity)
    private readonly accountsRepository: Repository<AccountEntity>,
    private readonly accountsUsersService: AccountsUsersService,
    private readonly usersService: UsersService
    // private readonly plansService: PlansService,
    // private readonly paymentsService: PaymentsService,
  ) {
    super(req, 'AccountEntity')

    // TODO: inject this instead of instantiate
    // this.stripeClient = { ...stripe, createStripeFreeSubscription }
  }

  // public _createOne(data): Promise<AccountEntity> {
  //   return this.createOne(data);
  // }

  async getAll (): Promise<AccountEntity[]> {
    const accounts = await this.accountsRepository.find()

    return accounts
  }

  async findByOwnerEmail (email: string): Promise<AccountEntity> {
    const user = await this.accountsUsersService.findUserByEmail(email)
    const _result = await this.query({ filter: { owner_id: { eq: user.id } } })

    return _result[0]
  }

  /**
   * Add an account.
   *
   * Create a new account
   * Create a stipe user and add to the account
   * If a user is specified, add such user as owner (to remove?)
   *
   * @param data data of the account
   * @param user data of the account owner
   */
  async add ({ data, user }): Promise<AccountEntity | null> {
    // Create an account
    const account = new AccountEntity()
    account.data = new AccountData()
    account.data.name = data.name

    // If no user was passed, we add 0 as owner_id.
    // This will be overwritten later when the first user
    // will be associated with this account.
    account.owner_id = user?.id ?? 0

    /*
    // Create a Stripe user for this account
    const stripeCustomer = await this.stripeClient.customers.create({
      name: data.name
    })
    account.data.stripe = stripeCustomer

    // Add free tier plan
    const plans = await this.plansService.getPlans()
    await this.stripeClient.createStripeFreeSubscription(
      plans[0],
      stripeCustomer
    )
    */

    try {
      const res = await this.createOne(account)
      // If a user is specified add the user as owner
      if (user !== undefined) await this.accountsUsersService.addUser(user, res)
      // TODO: refactor this

      return res
    } catch (err) {
      console.error('Error while inserting new account', data, user, err)
      return null
    }
  }

  // TODO: TDD this
  async getUsers (id: number): Promise<any[]> { // TODO: fix return value
    // 1. get users id from accountUsers table
    const usersIds = await this.accountsUsersService.query({
      filter: { account_id: { eq: id } }
    })

    // 2. get all info for each user
    const users = await Promise.all(
      usersIds.map(async u =>
        await this.usersService.query({ filter: { id: { eq: u.user_id } } })
      )
    )

    return users
  }

  async setOwner (account: AccountEntity, userId: number): Promise<any> {
    // Setting owner if not already set.
    // This is useful for the creation of the first user.
    if (account.owner_id === 0) {
      try {
        await this.updateOne(account.id, { owner_id: userId })
      } catch (err) {
        console.error(
          'accounts.service - inviteUser - Error while inviting new user (setting owner)',
          err
        )
        return null
      }
    }
  }

  /**
   * Invite a user.
   *
   * Create a new user and reset its password.
   * Then add it to the accountUser model
   *
   * @param userInput data of the user to invite
   * @param accountId id of the account to add the user to
   */
  async inviteUser (userInput: any, accountId: number): Promise<UserEntity | null> { // TODO: specify type
    if (userInput == null) {
      return null
    }

    // Get account
    const account = await this.findById(accountId)
    if (account == null) {
      console.error('accounts.service - inviteUser - account not found')
      return null
    }

    const email = userInput.email

    const user = await this.usersService.findOrCreateUser(email)
    if (user == null) {
      return null
    }

    await this.setOwner(account, user.id)

    if (await this.accountsUsersService.addUser(user, account) == null) {
      return null
    }

    return user
  }

  async addUser (user: any, accountId: Number): Promise<UserEntity | null> {
    const account = await this.findById(accountId as any)
    if (account === undefined) {
      return null
    }

    return await this.inviteUser(user, account.id)
  }

  async findByUserId (userId): Promise<AccountEntity | undefined> {
    const users = await this.accountsUsersService.query({
      filter: { user_id: { eq: userId } }
    })
    const account = await this.findById(users[0]?.account_id)

    return account
  }

  // TODO: call this from user profile payments method page
  async getPaymentsMethods (id: number): Promise<[any] | undefined> {
    try {
      const account = await this.findById(id)
      return account?.data?.payments_methods ?? []
    } catch (error) {
      console.error('getPaymentsMethods - error', id, error)
    }
  }

  /*
  async addPaymentsMethods (id: number, card: any): Promise<[any] | null | undefined> {
    try {
      const account = await this.findById(id)
      if (account === undefined) {
        console.error('addPaymentsMethods - account not found')
        return null
      }
      if (account.data === undefined) {
        console.error('addPaymentsMethods - account format error')
        return null
      }

      const method = await this.paymentsService.createPaymentMethod(account.data.stripe.id, card)
      // TODO: check errors
      account.data.payments_methods = [...account?.data?.payments_methods, method]

      await this.updateOne(id, { data: account.data })

      return account.data.payments_methods
    } catch (error) {
      console.error('getPaymentsMethods - error', id, error)
    }
  }
  */

  /*
  async subscribeToPlan (account: AccountEntity, subscription: any): Promise<any> {
    // Getting the first method.
    // This is a hack to only use 1 PM for the MVP.
    // FIXME.
    const paymentMethod = account.data.payments_methods[0]

    const price = await this.plansService.getPriceByProductAndAnnual(subscription.plan, subscription.monthly)

    this.paymentsService.subscribeToPlan(account.data.stripe.id, paymentMethod, price)
  }
  */
}
