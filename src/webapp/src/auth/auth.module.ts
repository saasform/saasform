import { Module } from '@nestjs/common'
import { AuthService } from './auth.service'
import { PassportModule } from '@nestjs/passport'
import { LocalStrategy } from './local.strategy'
import { JwtStrategy } from './jwt.strategy'
import { AzureAdStrategy } from './azuread.strategy'
import { MiraclStrategy } from './miracl.strategy'
import { OktaStrategy } from './okta.strategy'
import { JwtModule } from '@nestjs/jwt'
import { AccountsModule } from '../accounts/accounts.module'
import { SettingsService } from '../settings/settings.service'
import { PaymentsModule } from '../payments/payments.module'
import { GoogleOAuth2Service } from './google.service'
import { BearerTokenStrategy } from './bearertoken.strategy'

@Module({
  imports: [
    AccountsModule,
    PaymentsModule,
    PassportModule.register({ session: true }),
    JwtModule.registerAsync({
      useFactory: async (settingsService: SettingsService) => ({
        privateKey: await settingsService.getJWTPrivateKey(),
        signOptions: {
          algorithm: 'ES256'
        }
      }),
      inject: [SettingsService]
    })
  ],
  providers: [
    SettingsService,
    AuthService,
    LocalStrategy,
    JwtStrategy,
    GoogleOAuth2Service,
    AzureAdStrategy,
    MiraclStrategy,
    OktaStrategy,
    BearerTokenStrategy
  ],
  exports: [AuthService, GoogleOAuth2Service, JwtModule]
})
export class AuthModule {}
