import {
  Controller,
  Get,
  Request,
  Res,
  UseGuards
} from '@nestjs/common'
import { Response } from 'express'

import { SettingsService } from '../../settings/settings.service'
import { UserRequiredAuthGuard } from '../../auth/auth.guard'

import { AccountsService } from '../../accounts/services/accounts.service'
import { renderPage } from '../utilities/render'

@Controller('/user')
export class UserController {
  constructor (
    private readonly accountService: AccountsService,
    private readonly settingsService: SettingsService
  ) {}

  @UseGuards(UserRequiredAuthGuard)
  @Get('/')
  async getUser (@Request() req, @Res() res: Response): Promise<any> {
    // return res.render(`${data.root_theme as string}/user`, pageData)
    return renderPage(req, res, 'payment-methods', {
      user: req.user,
      user_page: 'general'
    })
  }

  @UseGuards(UserRequiredAuthGuard)
  @Get('/security')
  async getUserSecurity (@Request() req, @Res() res: Response): Promise<any> {
    const data = req.websiteData

    const pageData = {
      ...data,
      user: req.user,
      csrf_token: req.csrfToken(),
      user_page: 'security'
    }

    console.log(pageData)

    return res.render(`${data.root_theme as string}/user`, pageData)
  }

  @UseGuards(UserRequiredAuthGuard)
  @Get('/team')
  async getUserTeam (@Request() req, @Res() res: Response): Promise<any> {
    const account_users = await this.accountService.getUsers(req.user.account_id) // eslint-disable-line

    console.log(account_users)

    return renderPage(req, res, 'user', { account_users })
  }

  @UseGuards(UserRequiredAuthGuard)
  @Get('/billing')
  async getUserBilling (@Request() req, @Res() res: Response): Promise<any> {
    const data = req.websiteData

    const pageData = {
      ...data,
      user: req.user,
      csrf_token: req.csrfToken(),
      user_page: 'billing'
    }

    console.log(pageData)

    return res.render(`${data.root_theme as string}/user`, pageData)
  }
}
