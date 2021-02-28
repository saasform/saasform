import {
  Controller,
  Get,
  Post,
  Request,
  Res,
  UseGuards
} from '@nestjs/common'
import { Response } from 'express'

import { SettingsService } from '../../settings/settings.service'
import { UserRequiredAuthGuard } from '../../auth/auth.guard'

import { AccountsService } from '../../accounts/services/accounts.service'
import { renderUserPage } from '../utilities/render'

@Controller('/user')
export class UserController {
  constructor (
    private readonly accountService: AccountsService,
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
    const account_users = await this.accountService.getUsers(req.user.account_id) // eslint-disable-line

    return renderUserPage(req, res, 'team', {
      account_users
    })
  }

  @UseGuards(UserRequiredAuthGuard)
  @Post('/team')
  async addUserTeam (@Request() req, @Res() res: Response): Promise<any> {
    const invitedUser = await this.accountService.inviteUser(req.body, req.user.account_id)

    if (invitedUser == null) {
      return res.redirect('/error')
    }

    return res.redirect('/user/team')
  }

  @UseGuards(UserRequiredAuthGuard)
  @Get('/billing')
  async getUserBilling (@Request() req, @Res() res: Response): Promise<any> {
    return renderUserPage(req, res, 'billing', {
    })
  }
}
