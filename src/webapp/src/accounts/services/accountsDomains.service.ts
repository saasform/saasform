import { REQUEST } from '@nestjs/core'
import { Injectable, Scope, Inject } from '@nestjs/common'
import { QueryService } from '@nestjs-query/core'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { AccountDomainEntity } from '../entities/accountDomain.entity'
import { BaseService } from '../../utilities/base.service'
import { ValidationService } from '../../validator/validation.service'

@QueryService(AccountDomainEntity)
@Injectable({ scope: Scope.REQUEST })
export class AccountsDomainsService extends BaseService<AccountDomainEntity> {
  constructor (
    @Inject(REQUEST) private readonly req,
    @InjectRepository(AccountDomainEntity)
    private readonly accountsDomainsRepository: Repository<AccountDomainEntity>,
    private readonly validationService: ValidationService
  ) {
    super(
      req,
      'AccountDomainEntity'
    )
  }

  /**
   * Get accountId for the account linked with the domain
   *
   * @param domain domain to search
   */
  async getAccountIsByEmailDomain (domain: string): Promise<number|null> {
    const domains = await this.query({
      filter: { domain: { eq: domain } }
    })

    if (this.validationService.isNilOrEmpty(domains) === true) {
      // console.log('AccountsDomainsService - getAccountIsByEmailDomain - domain not found', domain, domains)
      return null
    }

    return domains[0].data.account_id
  }

  /**
   * Link a domain to an account
   *
   * @param domain domain to link
   * @param accountId id of the account
   */
  async link (domain: string, account_id: number): Promise<AccountDomainEntity | null> { //eslint-disable-line
    const accountDomain = new AccountDomainEntity()

    accountDomain.data = { account_id }
    accountDomain.domain = domain

    try {
      return await this.createOne(accountDomain)
    } catch (error) {
      console.error('AccountsDomainsService - link', error)
      return null
    }
  }

  /**
   * Unlink a domain to an account
   *
   * @param domain domain to link
   */
     async unlink (domain: string): Promise<boolean | null> { //eslint-disable-line
    try {
      await this.deleteMany(
        { domain: { eq: domain } }
      )

      return true
    } catch (error) {
      console.error('AccountsDomainsService - unlink', domain, error)
      return null
    }
  }
}
