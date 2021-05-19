import { Module } from '@nestjs/common'
import { AccountsModule } from '../accounts/accounts.module'
import { AuthModule } from '../auth/auth.module'
import { CronModule } from '../cron/cron.module'
import { PaymentsModule } from '../payments/payments.module'

import { ApiV1AccountController } from './controllers/v1/api.account.controller'
import { ApiV1AutheticationController } from './controllers/v1/api.authentication.controller'
import { ApiV1CronController } from './controllers/v1/api.cron.controller'
import { ApiV1PaymentController } from './controllers/v1/api.payment.controller'
import { ApiV1TeamController } from './controllers/v1/api.team.controller'
import { ApiV1UserController } from './controllers/v1/api.user.controller'

@Module({
  imports: [
    AccountsModule,
    AuthModule,
    CronModule,
    PaymentsModule
  ],
  controllers: [
    ApiV1AccountController,
    ApiV1AutheticationController,
    ApiV1CronController,
    ApiV1PaymentController,
    ApiV1TeamController,
    ApiV1UserController
  ]
})
export class ApiModule {}
