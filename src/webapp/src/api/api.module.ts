import { Module } from '@nestjs/common'
import { AccountsModule } from '..//accounts/accounts.module'
import { AuthModule } from '..//auth/auth.module'
import { ApiV1Controller } from './controllers/api.v1.controller'

@Module({
  imports: [AccountsModule, AuthModule],
  controllers: [ApiV1Controller]
})
export class ApiModule {}
