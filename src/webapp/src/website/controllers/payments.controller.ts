import {
  Controller,
  Get,
  Post,
  Request,
  Res,
  UseGuards
  //   Param
} from '@nestjs/common'
import { Response } from 'express'
import { UserRequiredAuthGuard } from '../../auth/auth.guard'
import { AccountsService } from '../../accounts/services/accounts.service'
import { PaymentsService } from '../../payments/services/payments.service'
import { PlansService } from '../../payments/services/plans.service'

import { renderPage } from '../utilities/render'

@Controller()
export class PaymentsController {
  constructor (
    private readonly accountsService: AccountsService,
    private readonly paymentsService: PaymentsService,
    private readonly plansService: PlansService
  ) {}

  @UseGuards(UserRequiredAuthGuard)
  @Get('/user/billing/payment')
  async getPaymentMethodList (@Request() req, @Res() res: Response): Promise<any> {
    const account = await this.accountsService.findByOwnerEmail(req.user.email)

    return renderPage(req, res, 'payment-methods', { account })
  }

  // @UseGuards(UserRequiredAuthGuard)
  // @Post('/user/billing/payment')
  // async newPaymentMethod (@Request() req, @Res() res: Response): Promise<any> {
  //   // DEPRECATED, see https://stripe.com/docs/payments/accept-a-payment-charges#web-create-token
  //   const account = await this.accountsService.findByOwnerEmail(req.user.email)

  //   await this.accountsService.createPaymentsMethods(account.id, req.body)

  //   return res.redirect('/user/billing/subscribe')
  // }

  @UseGuards(UserRequiredAuthGuard)
  @Get('/user/billing/subscribe')
  async subscribePage (@Request() req, @Res() res: Response): Promise<any> {
    const account = await this.accountsService.findByOwnerEmail(req.user.email)
    const plans = this.plansService.getPlans()

    return renderPage(req, res, 'subscribe', {
      account,
      plans,
      user: req.user,
      html_payments_processor: this.paymentsService.getHtml()
    })
  }

  @UseGuards(UserRequiredAuthGuard)
  @Post('/user/billing/subscribe')
  async subscribeToPlan (@Request() req, @Res() res: Response): Promise<any> {
    const account = await this.accountsService.findByOwnerEmail(req.user.email)

    await this.accountsService.subscribeToPlan(account, req.body)

    return res.redirect('/')
  }

  @UseGuards(UserRequiredAuthGuard)
  @Get('/payment')
  async getPayment (@Request() req, @Res() res: Response): Promise<any> {
    return renderPage(req, res, 'payment', {
      html_payments_processor: this.paymentsService.getHtml()
    })
  }
}
