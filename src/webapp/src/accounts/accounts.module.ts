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

@Module({
  imports: [
    NestjsQueryGraphQLModule.forFeature({
      imports: [NestjsQueryTypeOrmModule.forFeature([AccountEntity, UserEntity, AccountUserEntity, UserCredentialsEntity])],
      services: [AccountsService, AccountsUsersService, UsersService, UserCredentialsService],
      resolvers: [{ DTOClass: AccountDTO, ServiceClass: AccountsService }]
    })
  ],
  providers: [AccountsService, UsersService, AccountsUsersService, UserCredentialsService],
  exports: [AccountsService, UsersService, AccountsUsersService, UserCredentialsService]
})
export class AccountsModule {

}
