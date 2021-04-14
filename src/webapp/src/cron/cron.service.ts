import { Injectable } from '@nestjs/common'
import { SchedulerRegistry } from '@nestjs/schedule'
import { CronJob } from 'cron'

import { SettingsService } from '../settings/settings.service'
import { AccountsService } from '../accounts/services/accounts.service'
import { PaymentsService } from '../payments/services/payments.service'
import { NotificationsService } from '../notifications/notifications.service'

@Injectable()
export class CronService {
  constructor (
    private readonly paymentsService: PaymentsService,
    private readonly accountsService: AccountsService,
    private readonly notificationService: NotificationsService,
    private readonly settingsService: SettingsService,
    private readonly schedulerRegistry: SchedulerRegistry
  ) { }

  async setupCron (): Promise<any> {
    const adminSettings = await this.settingsService.getAdminSettings()
    const cronSchedule = adminSettings.trial_expiring_cron
    const name = 'trialSubscriptionReminder'
    try {
      const job = new CronJob(cronSchedule, () => {
        this.handleCron(adminSettings.trial_expiring_days) //eslint-disable-line
      })
      this.schedulerRegistry.addCronJob(name, job)
      job.start()
    } catch (error) {
      console.error('Error in setting up cron', error)
    }
  }

  async handleCron (days): Promise<any> {
    const expiringSubscriptions = await this.paymentsService.getExpiringPayments(days)
    if (expiringSubscriptions != null) {
      for (let i = 0; i < expiringSubscriptions.length; i++) {
        const owner = await this.accountsService.getOwner(expiringSubscriptions[i].account_id)

        if (owner != null) {
          await this.notificationService.sendEmail(owner?.email, 'trial_expiring', { action_url: `${await this.settingsService.getBaseUrl()}/user/billing/subscribe` })
        }
      }
    }
  }
}
