import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { SettingsModule } from '../settings/settings.module'
import { AuthenticationController } from './controllers/authentication.controller'
import { CommondController } from './controllers/common.controller'

@Module({
  imports: [SettingsModule, AuthModule],
  controllers: [CommondController, AuthenticationController]
})
export class WebsiteModule { }
