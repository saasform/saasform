import { Controller, Post, UseGuards, Request, Res } from '@nestjs/common'
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger'
import { Response } from 'express'
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
  async handleAddPaymentToken (@Request() req /*, @Res() res: Response */): Promise<any> {
    // const account = await this.accountsService.findByOwnerEmail(req.user.email)

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

    const validUser = await this.authService.getUserInfo(req.user.email)
    if (validUser == null) {
      // this should never happen
      console.error('ApiV1PaymentController - handleAddPaymentToken - Cannot retrieve validUser')
      return {
        statusCode: 400,
        error: 'Unexpected error. Please try again.'
      }
    }

    req.user = await this.authService.getTokenPayloadFromUserModel(validUser)

    // await this.authService.setJwtCookie(req, res, req.user)

    if (req.query.redirect != null) {
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
  async handlePurchasePlan (@Request() req, @Res() res: Response): Promise<any> {
    const account = await this.accountsService.findByOwnerEmail(req.user.email)

    if (account == null) {
      return res.json({
        statusCode: 400,
        error: 'Account not found'
      })
    }

    const { plan, method, monthly } = req.body

    if (plan == null) {
      return res.json({
        statusCode: 400,
        error: 'Plan not found'
      })
    }

    const result = await this.accountsService.subscribeToPlan(account, { plan, method, monthly })

    return res.json({
      statusCode: 200,
      message: result
    })
  }
}
