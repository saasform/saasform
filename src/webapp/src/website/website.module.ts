import { Module, NestModule, MiddlewareConsumer, Scope } from '@nestjs/common'
import { APP_INTERCEPTOR } from '@nestjs/core'

import { AccountsModule } from '../accounts/accounts.module'
import { AuthModule } from '../auth/auth.module'
import { SettingsModule } from '../settings/settings.module'
import { AuthenticationController } from './controllers/authentication.controller'
import { CommonController } from './controllers/common.controller'
import { PaymentsController } from './controllers/payments.controller'
import { UserController } from './controllers/user.controller'
import { PublicController } from './controllers/public.controller'
import { AdminController } from './controllers/admin.controller'
import { WebsiteDataMiddleware } from 'src/middlewares/websiteData.middleware'

import { JwtInterceptor } from '../interceptors/jwt.interceptor'

@Module({
  imports: [AuthModule, SettingsModule, AccountsModule],
  controllers: [
    CommonController,
    AuthenticationController,
    PaymentsController,
    UserController,
    AdminController,
    PublicController
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: JwtInterceptor,
      scope: Scope.TRANSIENT
    }
  ]
})
export class WebsiteModule implements NestModule {
  configure (consumer: MiddlewareConsumer): any {
    consumer
      .apply(WebsiteDataMiddleware)
      .forRoutes('*')
  }
}
