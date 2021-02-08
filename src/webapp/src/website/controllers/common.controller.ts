import {
  Controller,
  Get,
  Request,
  Res
  //   Param
} from '@nestjs/common'; import { Response } from 'express'
import { SettingsService } from '../../settings/settings.service'

@Controller('/')
export class CommondController {
  constructor (
    private readonly settingsService: SettingsService
  ) {}

  @Get('/error')
  async getLogin (@Request() req, @Res() res: Response): Promise<any> {
    const data = await this.settingsService.getWebsiteRenderingVariables()
    const pageData = {
      ...data
    }

    return res.render(`${data.themeRoot as string}/error`, pageData)
  }
}
