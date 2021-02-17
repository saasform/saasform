import {
  Controller,
  Get,
  Request,
  Res,
  UseGuards
  //   Param
} from '@nestjs/common'
import { Response } from 'express'
import { SettingsService } from '../../settings/settings.service'
import { UserOptionalAuthGuard } from '../..//auth/auth.guard'

@Controller()
export class PublicController {
  constructor (
    private readonly settingsService: SettingsService
  ) {}

  @UseGuards(UserOptionalAuthGuard)
  @Get('/')
  async getHome (@Request() req, @Res() res: Response): Promise<any> {
    const data = await this.settingsService.getWebsiteRenderingVariables()

    const pageData = {
      ...data,
      csrf_token: req.csrfToken()
    }

    return res.render(`${data.root_theme as string}/index`, pageData)
  }
}
