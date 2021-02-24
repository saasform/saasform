import { Injectable, NestMiddleware } from '@nestjs/common'
import { Response, NextFunction } from 'express'

import { SettingsService } from '../settings/settings.service'

@Injectable()
export class WebsiteDataMiddleware implements NestMiddleware {
  constructor (private readonly settingsService: SettingsService) { }

  async use (req, res: Response, next: NextFunction): Promise<any> {
    const data = await this.settingsService.getWebsiteRenderingVariables()
    req.websiteData = data
    next()
  }
}
