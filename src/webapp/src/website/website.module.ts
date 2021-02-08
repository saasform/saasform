import { Module } from '@nestjs/common'
import { AccountsModule } from '../accounts/accounts.module'
import { AuthModule } from '../auth/auth.module'
import { SettingsModule } from '../settings/settings.module'
import { AuthenticationController } from './controllers/authentication.controller'
import { CommondController } from './controllers/common.controller'
import { PublicController } from './controllers/public.controller'

@Module({
  imports: [SettingsModule, AuthModule, AccountsModule],
  controllers: [CommondController, AuthenticationController, PublicController]
})
export class WebsiteModule { }
