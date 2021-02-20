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

@Controller('/user')
export class UserController {
  constructor (
    private readonly settingsService: SettingsService
  ) {}

  @UseGuards(UserRequiredAuthGuard)
  @Get('/')
  async getUser (@Request() req, @Res() res: Response): Promise<any> {
    const data = await this.settingsService.getWebsiteRenderingVariables()

    const pageData = {
      ...data,
      user: req.user,
      csrf_token: req.csrfToken(),
      user_page: 'general'
    }

    console.log(pageData)

    return res.render(`${data.root_theme as string}/user`, pageData)
  }

  @UseGuards(UserRequiredAuthGuard)
  @Get('/security')
  async getUserSecurity (@Request() req, @Res() res: Response): Promise<any> {
    const data = await this.settingsService.getWebsiteRenderingVariables()

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
    const data = await this.settingsService.getWebsiteRenderingVariables()

    const pageData = {
      ...data,
      user: req.user,
      csrf_token: req.csrfToken(),
      user_page: 'team'
    }

    console.log(pageData)

    return res.render(`${data.root_theme as string}/user`, pageData)
  }

  @UseGuards(UserRequiredAuthGuard)
  @Get('/billing')
  async getUserBilling (@Request() req, @Res() res: Response): Promise<any> {
    const data = await this.settingsService.getWebsiteRenderingVariables()

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
