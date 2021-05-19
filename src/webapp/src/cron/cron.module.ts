import { Module } from '@nestjs/common'
import { CronService } from './cron.service'

import { AccountsModule } from '../accounts/accounts.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { PaymentsModule } from '../payments/payments.module'

@Module({
  imports: [AccountsModule, NotificationsModule, PaymentsModule],
  providers: [CronService],
  exports: [CronService]
})
export class CronModule { }
