import { Module } from '@nestjs/common'
import { AccountsModule } from '../accounts/accounts.module'
import { AuthModule } from '../auth/auth.module'
import { SettingsModule } from '../settings/settings.module'
import { AuthenticationController } from './controllers/authentication.controller'
import { CommondController } from './controllers/common.controller'

@Module({
  imports: [SettingsModule, AuthModule, AccountsModule],
  controllers: [CommondController, AuthenticationController]
})
export class WebsiteModule { }
