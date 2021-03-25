import { Module } from '@nestjs/common'
import { SettingsModule } from '../settings/settings.module'
import { AccountsModule } from '../accounts/accounts.module'
import { AuthModule } from '..//auth/auth.module'
import { ApiV1AutheticationController } from './controllers/v1/api.authentication.controller'
import { ApiV1PaymentController } from './controllers/v1/api.payment.controller'
import { ApiV1UserController } from './controllers/v1/api.user.controller'

@Module({
  imports: [AccountsModule, AuthModule, SettingsModule],
  controllers: [ApiV1AutheticationController, ApiV1PaymentController, ApiV1UserController]
})
export class ApiModule {}
