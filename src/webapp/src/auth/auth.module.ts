import { Module } from '@nestjs/common'
import { AuthService } from './auth.service'
import { PassportModule } from '@nestjs/passport'
import { LocalStrategy } from './local.strategy'
import { JwtStrategy } from './jwt.strategy'
import { JwtModule } from '@nestjs/jwt'
import { AccountsModule } from '../accounts/accounts.module'
import { AccountsService } from '../accounts/services/accounts.service'
import { SettingsModule } from '../settings/settings.module'
import { SettingsService } from '../settings/settings.service'
import { PaymentsModule } from '../payments/payments.module'
import { GoogleOAuth2Service } from './google.service'

@Module({
  imports: [
    AccountsModule,
    PaymentsModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [SettingsModule, AccountsModule],
      useFactory: async (settingsService: SettingsService) => ({
        privateKey: await settingsService.getJWTPrivateKey(),
        signOptions: {
          algorithm: 'ES256'
        }
      }),
      inject: [SettingsService, AccountsService]
    })
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy, SettingsService, GoogleOAuth2Service],
  exports: [AuthService, GoogleOAuth2Service]
})
export class AuthModule {}
