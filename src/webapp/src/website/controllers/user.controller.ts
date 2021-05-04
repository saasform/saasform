import {
  Controller,
  Get,
  Post,
  Request,
  Res,
  UseGuards
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Response } from 'express'

import { UserRequiredAuthGuard } from '../../auth/auth.guard'
import { AccountsService } from '../../accounts/services/accounts.service'
import { UsersService } from '../../accounts/services/users.service'
import { PlansService } from '../../payments/services/plans.service'
import { SettingsService } from '../../settings/settings.service'

import { renderUserPage } from '../utilities/render'
import { PaymentsService } from 'src/payments/services/payments.service'

@Controller('/user')
export class UserController {
  constructor (
    private readonly accountsService: AccountsService,
    private readonly usersService: UsersService,
    private readonly plansService: PlansService,
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
    private readonly settingsService: SettingsService
  ) {}

  @UseGuards(UserRequiredAuthGuard)
  @Get('/')
  async getUser (@Request() req, @Res() res: Response): Promise<any> {
    return renderUserPage(req, res, 'general', {
      // alert: {
      //   text: 'Your free trial is expired.',
      //   link_url: '/user/billing',
      //   link_text: 'Upgrade your plan.',
      // }
    })
  }

  @UseGuards(UserRequiredAuthGuard)
  @Get('/security')
  async getUserSecurity (@Request() req, @Res() res: Response): Promise<any> {
    return renderUserPage(req, res, 'security', {
    })
  }

  @UseGuards(UserRequiredAuthGuard)
  @Get('/team')
  async getUserTeam (@Request() req, @Res() res: Response): Promise<any> {
    const account_users = await this.accountsService.getUsers(req.user.account_id) // eslint-disable-line

    return renderUserPage(req, res, 'team', {
      account_users
    })
  }

  @UseGuards(UserRequiredAuthGuard)
  @Post('/profile')
  async updateUserProfile (@Request() req, @Res() res: Response): Promise<any> {
    const updatedUser = await this.usersService.updateUserProfile(req.body, req.user.id)

    if (updatedUser == null) {
      return res.redirect('/error')
    }

    return res.redirect('/user/team')
  }

  @UseGuards(UserRequiredAuthGuard)
  @Post('/team')
  async addUserTeam (@Request() req, @Res() res: Response): Promise<any> {
    const invitedUser = await this.accountsService.inviteUser(req.body, req.user.account_id)

    if (invitedUser == null) {
      return res.redirect('/error')
    }

    return res.redirect('/user/team')
  }

  @UseGuards(UserRequiredAuthGuard)
  @Get('/billing')
  async getUserBilling (@Request() req, @Res() res: Response): Promise<any> {
    const account = await this.accountsService.findById(req.user.account_id)
    const plans = await this.plansService.getPricingAndPlans()
    let activeSubscription = {}

    // TOOD: move this into a function?
    const payment = await this.paymentsService.getActivePayments(req.user.account_id)

    if (payment != null) {
      const activePlan = await this.plansService.getPlanForPayment(payment)

      const nextPaymentDate = new Date(payment.data.current_period_end * 1000)
      const nextPayment = `${nextPaymentDate.getDate()}/${(nextPaymentDate.getMonth() + 1)}/${nextPaymentDate.getFullYear()}`

      let subscriptionCurrency: string = payment.data.plan.currency

      switch (payment.data.plan.currency) {
        case 'usd':
          subscriptionCurrency = '$'
          break
      }

      activeSubscription = {
        expiration: payment.data.current_period_end,
        next_payment: nextPayment,
        currency: subscriptionCurrency,
        interval: payment.data.plan.interval,
        price: payment.data.plan.amount,
        name: activePlan.name,
        data: activePlan
      }
    }

    return renderUserPage(req, res, 'billing', {
      account,
      plans,
      activeSubscription,
      stripePublishableKey: this.configService.get('STRIPE_PUBLISHABLE_KEY')
    })
  }

  @UseGuards(UserRequiredAuthGuard)
  @Post('/password-change')
  async postChangePassword (@Request() req, @Res() res: Response): Promise<any> {
    const { password, newpassword, confirmation } = req.body

    if (password == null) {
      const error = {
        password: 'Password not valid.'
      }
      return renderUserPage(req, res, 'team', { error })
    }

    if (newpassword !== confirmation) {
      const error = {
        confirmation: 'Confirmation password doesn\'t match'
      }
      return renderUserPage(req, res, 'team', { error })
    }

    // await this.usersService.resetPassword(password)
    const result = await this.usersService.changePassword(req.user.email, password, newpassword)

    if (result == null) {
      return res.redirect('/error')
    }

    return res.redirect('/user/team')
  }
}
