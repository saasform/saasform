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
import { AccountsService } from 'src/accounts/services/accounts.service'

@Controller()
export class PaymentsController {
  constructor (
    private readonly settingsService: SettingsService,
    private readonly accountsService: AccountsService
  ) {}

  @UseGuards(UserRequiredAuthGuard)
  @Get('user/billing/payment')
  async getPaymentMethodList(@Request() req, @Res() res: Response) {
    const account = await this.accountsService.findByOwnerEmail(req.user.email);

    console.log('account', account);
    const data = await this.settingsService.getWebsiteRenderingVariables()
    const pageData = {
      ...data,
      csrfToken: req.csrfToken()
    }

    return res.render(`${data.themeRoot as string}/payment-methods`, pageData)
  }

  @UseGuards(UserRequiredAuthGuard)
  @Post('user/billing/payment')
  async newPaymentMethod(@Request() req, @Res() res: Response) {
    const account = await this.accountsService.findByOwnerEmail(req.user.email);

    await this.accountsService.addPaymentsMethods(account.id, req.body);

    return res.redirect('/user/billing');
  }
}
