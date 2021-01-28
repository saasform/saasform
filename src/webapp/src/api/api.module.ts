import { Module } from '@nestjs/common'
import { AccountsModule } from 'src/accounts/accounts.module'
import { AuthModule } from 'src/auth/auth.module'
import { ApiV1Controller } from './controllers/api.v1.controller'

@Module({
  imports: [AccountsModule, AuthModule],
  controllers: [ApiV1Controller]
})
export class ApiModule {}
