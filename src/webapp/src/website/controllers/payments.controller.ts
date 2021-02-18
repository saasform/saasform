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
import { SettingsService } from '../../settings/settings.service'
import { UserOptionalAuthGuard, UserRequiredAuthGuard } from '../../auth/auth.guard'
import { AccountsService } from '../../accounts/services/accounts.service'
import { PlansService } from '../../payments/services/plans.service'

@Controller()
export class PaymentsController {
  constructor (
    private readonly settingsService: SettingsService,
    private readonly accountsService: AccountsService,
    private readonly plansService: PlansService
  ) {}

  @UseGuards(UserRequiredAuthGuard)
  @Get('/user/billing/payment')
  async getPaymentMethodList(@Request() req, @Res() res: Response) {
    const account = await this.accountsService.findByOwnerEmail(req.user.email);

    const data = await this.settingsService.getWebsiteRenderingVariables()
    const pageData = {
      ...data,
      account,
      user: req.user,
      csrfToken: req.csrfToken()
    }

    return res.render(`${data.root_theme as string}/payment-methods`, pageData)
  }

  @UseGuards(UserRequiredAuthGuard)
  @Post('/user/billing/payment')
  async newPaymentMethod(@Request() req, @Res() res: Response) {
    const account = await this.accountsService.findByOwnerEmail(req.user.email)

    await this.accountsService.addPaymentsMethods(account.id, req.body);

    return res.redirect('/user/billing/subscribe');
  }

  @UseGuards(UserRequiredAuthGuard)
  @Get('/user/billing/subscribe')
  async subscribePage(@Request() req, @Res() res: Response) {
    const account = await this.accountsService.findByOwnerEmail(req.user.email)
    const plans = this.plansService.getPlans()

    const data = await this.settingsService.getWebsiteRenderingVariables()
    const pageData = {
      ...data,
      account,
      plans,
      user: req.user,
      csrfToken: req.csrfToken()
    }

    return res.render(`${data.root_theme as string}/subscribe`, pageData)
  }

  @UseGuards(UserRequiredAuthGuard)
  @Post('/user/billing/subscribe')
  async subscribeToPlan(@Request() req, @Res() res: Response) {
    const account = await this.accountsService.findByOwnerEmail(req.user.email)

    this.accountsService.subscribeToPlan(account, req.body)

    await this.accountsService.addPaymentsMethods(account.id, req.body);

    return res.redirect('/');
  }
}
