import {
  Controller,
  Get,
  Request,
  Res
  //   Param
} from '@nestjs/common'; import { Response } from 'express'
import { SettingsService } from '../../settings/settings.service'
import { AuthService } from '../..//auth/auth.service'

@Controller('/')
export class CommondController {
  constructor (
    private readonly authService: AuthService,
    private readonly settingsService: SettingsService
  ) {}

  @Get('/error')
  async getLogin (@Request() req, @Res() res: Response): Promise<any> {
    const data = await this.settingsService.getWebsiteRenderingVariables()
    const pageData = {
      ...data,
      csrfToken: req.csrfToken()
    }

    return res.render(`${data.themeRoot as string}/error`, pageData)
  }
}
