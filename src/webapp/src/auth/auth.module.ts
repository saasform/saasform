import { Module } from '@nestjs/common'
import { AuthService } from './auth.service'
// import { UsersModule } from '../users/users.module'
import { PassportModule } from '@nestjs/passport'
import { LocalStrategy } from './local.strategy'
import { JwtStrategy } from './jwt.strategy'
import { JwtModule } from '@nestjs/jwt'
// import { SettingsService } from '../settings/settings.service'
// import { SettingsModule } from '../settings/settings.module'
import { AccountsModule } from '../accounts/accounts.module'
import { AccountsService } from '../accounts/services/accounts.service'
// import { UsersCredentialsModule } from '../usersCredentials/userCredentials.module'

// import { PaymentsModule } from '../paymentModule/payments.module'
// import { PaymentsService } from '../paymentModule/payments.service'
// import { GoogleService } from './google.service'
// import { PlansModule } from '../plans/plans.module'

@Module({
  imports: [
    // SettingsModule,
    // UsersModule,
    // UsersCredentialsModule,
    AccountsModule,
    // PaymentsModule,
    PassportModule,
    // PlansModule,
    JwtModule.registerAsync({
      imports: [/* SettingsModule, PaymentsModule, */AccountsModule],
      // useFactory: async (settingsService: SettingsService) => ({
      //   privateKey: await settingsService.getJWTPrivateKey(),
      //   signOptions: {
      //     algorithm: 'ES256'
      //   }
      // }),
      useFactory: async (_) => {
        const privateKey = '-----BEGIN EC PRIVATE KEY-----\nMHQCAQEEIMhbZNd8LHVCB7M42/cfP1nulEcb7rzjwGUP+BGOWPvtoAcGBSuBBAAK\noUQDQgAEuvBUTvRfwq5zFQGYEunyWUJ/fogZrQHFhXsyyjRFtk3Wfxy41GfhIEUg\n1O7hNJbCFldaTWsUp8W7mAbHU+xB2w==\n-----END EC PRIVATE KEY-----'
        return {
          privateKey: privateKey,
          signOptions: {
            algorithm: 'ES256'
          }
        }
      },
      inject: [/* SettingsService, PaymentsService, */AccountsService]
    })
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy/* , SettingsService, GoogleService */],
  exports: [AuthService/* , GoogleService */]
})
export class AuthModule {}
