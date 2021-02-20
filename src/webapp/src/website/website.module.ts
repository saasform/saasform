import { Module } from '@nestjs/common'
import { AccountsModule } from '../accounts/accounts.module'
import { AuthModule } from '../auth/auth.module'
import { SettingsModule } from '../settings/settings.module'
import { AuthenticationController } from './controllers/authentication.controller'
import { CommonController } from './controllers/common.controller'
import { PaymentsController } from './controllers/payments.controller'
import { UserController } from './controllers/user.controller'
import { PublicController } from './controllers/public.controller'

@Module({
  imports: [SettingsModule, AuthModule, AccountsModule],
  controllers: [
    CommonController,
    AuthenticationController,
    PaymentsController,
    UserController,
    PublicController
  ]
})
export class WebsiteModule { }
