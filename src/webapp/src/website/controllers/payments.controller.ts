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
import { PlansService } from '../../payments/services/plans.service'
import { ConfigService } from '@nestjs/config'

import { renderPage } from '../utilities/render'

@Controller()
export class PaymentsController {
  constructor (
    private readonly accountsService: AccountsService,
    private readonly plansService: PlansService,
    public configService: ConfigService
  ) {}

  @UseGuards(UserRequiredAuthGuard)
  @Get('/user/billing/payment')
  async getPaymentMethodList (@Request() req, @Res() res: Response): Promise<any> {
    const account = await this.accountsService.findByOwnerEmail(req.user.email)

    return renderPage(req, res, 'payment-methods', { account })
  }

  @UseGuards(UserRequiredAuthGuard)
  @Post('/user/billing/payment')
  async newPaymentMethod (@Request() req, @Res() res: Response): Promise<any> {
    const account = await this.accountsService.findByOwnerEmail(req.user.email)

    await this.accountsService.addPaymentsMethods(account.id, req.body)

    return res.redirect('/user/billing/subscribe')
  }

  @UseGuards(UserRequiredAuthGuard)
  @Get('/user/billing/subscribe')
  async subscribePage (@Request() req, @Res() res: Response): Promise<any> {
    const account = await this.accountsService.findByOwnerEmail(req.user.email)
    const plans = this.plansService.getPlans()

    return renderPage(req, res, 'subscribe', {
      account,
      plans,
      user: req.user,
      stripePublishableKey: this.configService.get('STRIPE_PUBLISHABLE_KEY')
    })
  }

  @UseGuards(UserRequiredAuthGuard)
  @Post('/user/billing/subscribe')
  async subscribeToPlan (@Request() req, @Res() res: Response): Promise<any> {
    const account = await this.accountsService.findByOwnerEmail(req.user.email)

    await this.accountsService.subscribeToPlan(account, req.body)

    return res.redirect('/')
  }
}
