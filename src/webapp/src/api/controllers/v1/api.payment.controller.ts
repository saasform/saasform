import { Controller, Post, UseGuards, Request } from '@nestjs/common'
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger'
import { AccountsService } from '../../../accounts/services/accounts.service'
import { SettingsService } from '../../../settings/settings.service'
import { AuthService } from '../../../auth/auth.service'

import { UserRequiredAuthGuard } from '../../../auth/auth.guard'

@ApiBearerAuth()
@ApiCookieAuth()
@ApiTags('Settings page')
@Controller('/api/v1')
export class ApiV1PaymentController {
  constructor (
    private readonly accountsService: AccountsService,
    private readonly settingsService: SettingsService,
    private readonly authService: AuthService
  ) {}

  @UseGuards(UserRequiredAuthGuard)
  @Post('add-payment-token')
  async handleAddPaymentToken (@Request() req): Promise<any> {
    let payment
    try {
      payment = await this.accountsService.enrollOrUpdatePayment(req.user.account_id, req.body)

      if (payment == null) {
        return {
          statusCode: 400,
          error: 'Invalid credit card info. Please try again.'
        }
      }
    } catch (_) {
      return {
        statusCode: 400,
        error: 'Invalid credit card info. Please try again.'
      }
    }

    req.userUpdated = true

    if (req.query.redirect != null) {
      // TODO pass jwt
      const redirect = await this.settingsService.getActualRedirectAfterLogin(req.user, req.query.next)
      return {
        statusCode: 302,
        redirect
      }
    }

    return {
      statusCode: 200,
      message: 'Payment enrolled'
    }
  }

  @UseGuards(UserRequiredAuthGuard)
  @Post('purchase-plan')
  async handlePurchasePlan (@Request() req): Promise<any> {
    const account = await this.accountsService.findByOwnerEmail(req.user.email)

    if (account == null) {
      return {
        statusCode: 400,
        error: 'Account not found'
      }
    }

    const { plan, method, monthly } = req.body

    if (plan == null) {
      return {
        statusCode: 400,
        error: 'Plan not found'
      }
    }

    const result = await this.accountsService.subscribeToPlan(account, { plan, method, monthly })

    req.userUpdated = true
    return {
      statusCode: 200,
      message: result
    }
  }
}
