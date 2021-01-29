import { Module } from '@nestjs/common'
import { AuthService } from './auth.service'
import { PassportModule } from '@nestjs/passport'
import { LocalStrategy } from './local.strategy'
import { JwtStrategy } from './jwt.strategy'
import { JwtModule } from '@nestjs/jwt'
import { AccountsModule } from '../accounts/accounts.module'
import { AccountsService } from '../accounts/services/accounts.service'

@Module({
  imports: [
    AccountsModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [/* SettingsModule, */AccountsModule],
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
      inject: [/* SettingsService, */AccountsService]
    })
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy/* , SettingsService, GoogleService */],
  exports: [AuthService/* , GoogleService */]
})
export class AuthModule {}
