import { REQUEST } from '@nestjs/core'
import { Injectable, Inject } from '@nestjs/common'
import { QueryService } from '@nestjs-query/core'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { AccountEntity, AccountData } from '../entities/account.entity'

import { ConfigService } from '@nestjs/config'
import { ValidationService } from '../../validator/validation.service'

import { UsersService } from './users.service'
import { UserEntity } from '../entities/user.entity'
import { AccountsUsersService } from './accountsUsers.service'
import { AccountsDomainsService } from './accountsDomains.service'
import { BaseService } from '../../utilities/base.service'
import { NotificationsService } from '../../notifications/notifications.service'
import { SettingsService } from '../..//settings/settings.service'
import { PaymentsService } from '../../payments/services/payments.service'
import { PlansService } from '../../payments/services/plans.service'
import { UserJson } from '../dto/new-user.input'
import { Subscription } from 'src/payments/interfaces/subscription.interface'

@QueryService(AccountEntity)
@Injectable()
export class AccountsService extends BaseService<AccountEntity> {
  private readonly paymentIntegration: string

  constructor (
    @Inject(REQUEST) private readonly req: any,
    @InjectRepository(AccountEntity)
    private readonly accountsRepository: Repository<AccountEntity>,
    private readonly accountsUsersService: AccountsUsersService,
    private readonly usersService: UsersService,
    private readonly accountsDomainsService: AccountsDomainsService,
    private readonly paymentsService: PaymentsService,
    private readonly plansService: PlansService,
    private readonly notificationService: NotificationsService,
    private readonly settingsService: SettingsService,
    private readonly configService: ConfigService,
    private readonly validationService: ValidationService
  ) {
    super(req, 'AccountEntity')
    this.paymentIntegration = this.configService.get<string>('MODULE_PAYMENT', 'stripe')
  }

  async getAll (): Promise<AccountEntity[]> {
    const accounts = await this.accountsRepository.find()

    return accounts
  }

  async findByOwnerEmail (email: string): Promise<AccountEntity> {
    const user = await this.accountsUsersService.findUserByEmail(email)
    const _result = await this.query({ filter: { owner_id: { eq: user.id } } })

    return _result[0]
  }

  async getOwner (id: number): Promise<UserEntity | null> {
    try {
      const account = await this.findById(id)
      if (account == null) {
        console.error('accountsService - returnOwner - account not found')
        return null
      }

      const owner = await this.usersService.findById(account.owner_id)
      if (owner == null) {
        console.error('accountsService - returnOwner - owner not found')
        return null
      }

      return owner
    } catch (error) {
      console.error('accountsService - returnOwner - exception', error, id)
      return null
    }
  }

  /**
   * Return the account that is linked to a domain, if it exists. Null otherwise.
   *
   * @param domain to search
   * @returns the account or null
   */
  async getAccountByDomain (domain: string): Promise<AccountEntity|null> {
    const accountId = await this.accountsDomainsService.getAccountIsByEmailDomain(domain)
    if (accountId == null) {
      // console.log('accountsService - getAccountByEmailDomain - cannot find account for the domain', domain)
      return null
    }

    const account = await this.findById(accountId)

    if (account == null) {
      // this should never happend
      console.error('accountsService - getAccountByEmailDomain - cannot find account for the accountId', domain, accountId)
      return null
    }

    return account ?? null
  }

  /**
   * Return the account that is linked to an email domain, if it exists. Null otherwise.
   * For instance if a company links the domain "@company.com" every email @company.com
   * will return the company account
   *
   * @param email an email to search
   * @returns the account or null
   */
  async getAccountByEmailDomain (email: string): Promise<AccountEntity|null> {
    const domain = email.split('@')[1]
    return await this.getAccountByDomain(domain)
  }

  /**
   * Link a domain to an account _and_ mark the email verification to true
   *
   * @param id Id of the account to link
   * @param domain domain to link
   * @returns the linked account or null
   */
  async linkDomain (id: number, domain: string): Promise<AccountEntity | null> {
    const account = await this.findById(id)
    if (account == null) {
      console.error('accountsService - linkDomain - cannot find account', id)
      return null
    }

    if (await this.accountsDomainsService.link(domain, account.id) == null) {
      console.error('accountsService - linkDomain - cannot link account', id)
      return null
    }

    try {
      account.data.email_verification_required = true
      await this.updateOne(account.id, { data: account.data })

      return account
    } catch (err) {
      console.error(
        'accounts.service - linkDomain - Error while setting email_verification_required to true',
        id,
        err
      )

      await this.accountsDomainsService.unlink(domain)

      return null
    }
  }

  /**
   * Add or enroll a payment method for an account.
   * WARNING: method is user input and should NOT be used without validation.
   * It will be directly passed to the payment provider that MUST handle it securely.
   * @param accountId id of the account to enroll the payment
   * @param method payment method payload
   * @returns the payment enrolled
   */
  async enrollOrUpdatePayment (accountId: number, method: any): Promise<any | null> {
    const account = await this.findById(accountId)
    if (account == null) {
      return null
    }

    account.data.payment = await this.paymentsService.enrollOrUpdateAccount(account, '', method)

    try {
      await this.updateOne(account.id, { data: account.data })
    } catch (err) {
      console.error(
        'accounts.service - inviteUser - Error while inviting new user (setting owner)',
        err
      )
      return null
    }

    return account.data.payment
  }

  /**
   * Add an account and set the user as owner or attach the user
   * to the corresponding account, if the domain is linked.
   *
   * If the domain of the user's email is linked, add the user to the account.
   * Else, create a new account
   *    Create a stipe user and add to the account
   *    If a user is specified, add such user as owner (to remove?)
   *
   * @param data data of the account
   * @param user data of the account owner
   * @returns the account created or attached or null
   */
  async addOrAttach ({ data, user, chosenPlan }): Promise<AccountEntity | null> {
    let account
    if (user?.email != null && (account = await this.getAccountByEmailDomain(user.email)) != null) {
      // attach user to account
      if (user !== undefined) await this.accountsUsersService.addUser(user, account)

      return account
    } else {
      // Create an account
      account = new AccountEntity()
      account.data = new AccountData()
      account.data.name = data.name

      // If no user was passed, we add 0 as owner_id.
      // This will be overwritten later when the first user
      // will be associated with this account.
      account.owner_id = user?.id ?? 0

      // Manage payments
      account.data.payment = await this.paymentsService.enrollOrUpdateAccount(account, chosenPlan, null)

      try {
        const res = await this.createOne(account)
        // If a user is specified add the user as owner
        if (user !== undefined) {
          await this.accountsUsersService.addUser(user, res)
        }
        // TODO: refactor this

        if (user.data.emailConfirmed !== true) {
          // send email here (new account template)
          const emailData = {
            user,
            action_url: `${await this.settingsService.getBaseUrl()}/verify-email/${user.emailConfirmationToken as string}`
          }

          if ((await this.notificationService.sendEmail(user.email, 'email_confirm', emailData)) === false) {
            console.error('Error while sending email')
          }
        }

        return res
      } catch (err) {
        console.error('Error while inserting new account', data, user, err)
        return null
      }
    }
  }

  /**
   * Get users of a given account
   * @param id Id of the account to search
   */
  async getUsers (id: number): Promise<Array<UserEntity | undefined>> { // TODO: fix undefined return value. It should be null
    // 1. get users id from accountUsers table
    const usersIds = await this.accountsUsersService.query({
      filter: { account_id: { eq: id } }
    })

    // 2. get all info for each user
    const users = await Promise.all(
      usersIds.map(async u =>
        await this.usersService.findById(u.user_id)
      )
    )
    if (users == null) {
      // No users for account. This should never happend
      return []
    }

    return users.filter(u => u != null)
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
   * Update the name of the company in an account
   *
   * @param account account to update
   * @param companyName company name
   * @returns updated account
   */
  async setCompanyName (account: AccountEntity, companyName: string): Promise<any> {
    account.data.company = companyName

    try {
      return await this.updateOne(account.id, { data: account.data })
    } catch (err) {
      console.error(
        'accounts.service - inviteUser - Error while inviting new user (setting owner)',
        err
      )
      return null
    }
  }

  /**
   * Invite a user.
   *
   * Create a new user and reset its password.
   * Then add it to the accountUser model.
   *
   * @param userInput data of the user to invite
   * @param accountId id of the account to add the user to
   */
  async inviteUser (userInput: UserJson, accountId: number): Promise<UserEntity | null> { // TODO: specify type
    if (userInput == null) {
      return null
    }

    // Get account
    const account = await this.findById(accountId)
    if (account == null) {
      console.error('accounts.service - inviteUser - account not found')
      return null
    }

    const user = await this.usersService.findOrCreateUser(userInput)
    if (user == null) {
      return null
    }

    // TODO: can it be possible that an invited user is the owner?
    // maybe yes if it is invited by the saas admin
    await this.setOwner(account, user.id)

    if (await this.accountsUsersService.addUser(user, account) == null) {
      console.error(
        'accounts.service - inviteUser - Error while inviting new user (add accountUser relationthip)', user.id, account.id
      )
      return null
    }

    // send email here (invited user template)
    const emailData = {
      account,
      user,
      // TODO #98
      sender: {
        display_name: account.data.name
      },
      action_url: `${await this.settingsService.getBaseUrl()}/reset-password/${user.resetPasswordToken}`
    }
    if (await this.notificationService.sendEmail(user.email, 'user_invite', emailData) === false) {
      console.error('accountsService - inviteUser - error while sending email')
    }

    return user
  }

  async findByUserId (userId): Promise<AccountEntity | undefined> {
    const users = await this.accountsUsersService.query({
      filter: { user_id: { eq: userId } }
    })
    const account = await this.findById(users[0]?.account_id)

    return account
  }

  async deleteUser (userId: number): Promise<Boolean> {
    // TODO: implement this
    return true
  }

  /**
   * Subscribe an account to a plan
   *
   * This function has a number of fields that are contained inside the `subscription` parameter:
   * - plan: mandatory, the plan to purchase
   * - method: optional, the payment method to use; if absent the default payment method will be used
   * - monthly: optional, the indication whether to use a monthly payment; if absent the yearly payment will be used
   *
   * The function will do several things:
   * 1. fetch the payment method handle
   * 2. fetch the correct price, basing on price and monthly indication
   * 3. check if the account already has a plan
   * 4a. if the account has a plan, update it
   * 4b. if the account doesn't have a plan, create one
   *
   * @param account account to subscribe
   * @param subscription subscription to buy
   */
  async subscribeToPlan (account: AccountEntity, subscription: Subscription): Promise<any> { // TODO: return a proper type
    // 1. fetch payment method details
    const paymentMethod = account.data.payments_methods.filter(p => p?.id === subscription.method)[0] ?? account.data.payments_methods[0]

    // 2. fetch price
    const price = await this.plansService.getPriceByProductAndAnnual(subscription.plan, subscription.monthly)

    // 3. check if the account already has a plan
    const payment = await this.paymentsService.getActivePayments(account.id)
    if (payment != null) {
      // 4a. the account has a plan, update it
      const updatedPlan = await this.paymentsService.updatePlan(payment.stripe_id, price)
      if (updatedPlan == null) {
        console.error('accountService -- subscribeToPlan -- error while updating to new plan', account, payment, subscription)
        return null
      }

      return updatedPlan
    } else {
      // 4b. the account doesn't have a plan, create one
      const newPayment = await this.paymentsService.subscribeToPlan(account.data.stripe.id, paymentMethod, price)
      if (newPayment == null) {
        console.error('accountService -- subscribeToPlan -- error while subscribing to new plan', account, subscription, paymentMethod, price)
        return null
      }

      return newPayment
    }
  }
}
