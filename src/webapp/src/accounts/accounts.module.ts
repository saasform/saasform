import { Module } from '@nestjs/common'
import { NestjsQueryTypeOrmModule } from '@nestjs-query/query-typeorm'
import { NestjsQueryGraphQLModule } from '@nestjs-query/query-graphql'

import { AccountEntity } from './entities/account.entity'
import { AccountsService } from './services/accounts.service'
import { AccountsUsersService } from './services/accountsUsers.service'
import { UsersService } from './services/users.service'
import { AccountDTO } from './dto/account.dto'
import { UserDTO } from './dto/user.dto'
import { UserEntity } from './entities/user.entity'
import { UserCredentialsEntity } from './entities/userCredentials.entity'
import { AccountUserEntity } from './entities/accountUser.entity'
import { UserCredentialsService } from './services/userCredentials.service'
import { NotificationsModule } from '../notifications/notifications.module'
import { NotificationsService } from '../notifications/notifications.service'
import { PaymentsService } from '../payments/services/payments.service'
import { PlansService } from '../payments/services/plans.service'
import { AccountsDomainsService } from './services/accountsDomains.service'
import { AccountDomainEntity } from './entities/accountDomain.entity'

@Module({
  imports: [
    NestjsQueryGraphQLModule.forFeature({
      imports: [NestjsQueryTypeOrmModule.forFeature([AccountEntity, UserEntity, AccountUserEntity, AccountDomainEntity, UserCredentialsEntity]), NotificationsModule],
      services: [AccountsService, AccountsUsersService, UsersService, AccountsDomainsService, PaymentsService, PlansService, UserCredentialsService, NotificationsService],
      resolvers: [
        { DTOClass: AccountDTO, ServiceClass: AccountsService },
        { DTOClass: UserDTO, EntityClass: UserEntity }
      ]
    })
  ],
  providers: [AccountsService, UsersService, AccountsUsersService, AccountsDomainsService, UserCredentialsService],
  exports: [AccountsService, UsersService, AccountsUsersService, AccountsDomainsService, UserCredentialsService]
})
export class AccountsModule {

}
