import { Module } from '@nestjs/common'
import { SettingsModule } from '../settings/settings.module'
import { AccountsModule } from '../accounts/accounts.module'
import { AuthModule } from '..//auth/auth.module'
import { ApiV1AutheticationController } from './controllers/v1/api.authentication.controller'

@Module({
  imports: [AccountsModule, AuthModule, SettingsModule],
  controllers: [ApiV1AutheticationController]
})
export class ApiModule {}
