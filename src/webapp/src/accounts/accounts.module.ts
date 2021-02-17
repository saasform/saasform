import { Module } from '@nestjs/common'
import { NestjsQueryTypeOrmModule } from '@nestjs-query/query-typeorm'
import { NestjsQueryGraphQLModule } from '@nestjs-query/query-graphql'

import { AccountEntity } from './entities/account.entity'
import { AccountsService } from './services/accounts.service'
import { AccountsUsersService } from './services/accountsUsers.service'
import { UsersService } from './services/users.service'
import { AccountDTO } from './dto/account.dto'
import { UserEntity } from './entities/user.entity'
import { UserCredentialsEntity } from './entities/userCredentials.entity'
import { AccountUserEntity } from './entities/accountUser.entity'
import { UserCredentialsService } from './services/userCredentials.service'
import { NotificationsModule } from '../notifications/notifications.module'
import { NotificationsService } from '../notifications/notifications.service'
import { PaymentsService } from '../payments/services/payments.service'
import { PlansService } from '../payments/services/plans.service'
import { PaymentsModule } from '../payments/payments.module'

@Module({
  imports: [
    NestjsQueryGraphQLModule.forFeature({
      imports: [NestjsQueryTypeOrmModule.forFeature([AccountEntity, UserEntity, AccountUserEntity, UserCredentialsEntity]), NotificationsModule],
      services: [AccountsService, AccountsUsersService, UsersService, PaymentsService, PlansService, UserCredentialsService, NotificationsService],
      resolvers: [{ DTOClass: AccountDTO, ServiceClass: AccountsService }]
    })
  ],
  providers: [AccountsService, UsersService, AccountsUsersService, UserCredentialsService],
  exports: [AccountsService, UsersService, AccountsUsersService, UserCredentialsService]
})
export class AccountsModule {

}
