import { Controller, Get, Post, UseGuards, Request, Res } from '@nestjs/common'
import { Response } from 'express'
import { SettingsService } from '../../../settings/settings.service'
import { AccountsService } from '../../../accounts/services/accounts.service'
import { PlansService } from '../../../payments/services/plans.service'
import { PaymentsService } from '../../../payments/services/payments.service'
import { NotificationsService } from '../../../notifications/notifications.service'

import { UserRequiredAuthGuard } from '../../../auth/auth.guard'

@Controller('/api/v1')
export class ApiV1PaymentController {
  constructor (
    private readonly settingsService: SettingsService,
    private readonly accountsService: AccountsService,
    private readonly plansService: PlansService,
    private readonly paymentsService: PaymentsService,
    private readonly notificationService: NotificationsService
  ) {}

  @UseGuards(UserRequiredAuthGuard)
  @Post('add-payment-token')
  async handleAddPaymentToken (@Request() req, @Res() res: Response): Promise<any> {
    const account = await this.accountsService.findByOwnerEmail(req.user.email)

    if (account == null) {
      return res.json({
        statusCode: 400,
        error: 'Account not found'
      })
    }

    const methods = await this.accountsService.addPaymentsMethods(account.id, req.body)

    return res.json({
      statusCode: 200,
      message: methods
    })
  }

  // @UseGuards(UserRequiredAuthGuard)
  @Get('send-trial-expiration')
  async sendEmailReminder (@Request() req, @Res() res: Response): Promise<any> {
    const expiringSubscriptions = await this.paymentsService.getExpiringPayments()
    if (expiringSubscriptions != null) {
      for (let i = 0; i < expiringSubscriptions.length; i++) {
        const owner = await this.accountsService.getOwner(expiringSubscriptions[i].account_id)

        if (owner != null) {
          await this.notificationService.sendEmail(owner?.email, 'trial_expiring', {})
        }
      }
    }

    return res.json({
      statusCode: 200,
      message: 'done'
    })
  }
}
