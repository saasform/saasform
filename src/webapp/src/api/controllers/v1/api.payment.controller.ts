import { Controller, Post, UseGuards, Request, Res } from '@nestjs/common'
import { Response } from 'express'
import { AccountsService } from '../../../accounts/services/accounts.service'

import { UserRequiredAuthGuard } from '../../../auth/auth.guard'

@Controller('/api/v1')
export class ApiV1PaymentController {
  constructor (
    private readonly accountsService: AccountsService
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
