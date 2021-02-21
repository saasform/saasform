import {
  Controller,
  Get,
  Request,
  Res,
  UseGuards,
  NotFoundException,
  InternalServerErrorException
  //   Param
} from '@nestjs/common'
import { Response } from 'express'
import { Liquid } from 'liquidjs'
import * as MarkdownIt from 'markdown-it'

import { readFileSync } from 'fs'
import { join } from 'path'
import * as yaml from 'js-yaml'

import { SettingsService } from '../../settings/settings.service'
import { UserOptionalAuthGuard } from '../../auth/auth.guard'

@Controller()
export class PublicController {
  constructor (
    private readonly settingsService: SettingsService
  ) {}

  @UseGuards(UserOptionalAuthGuard)
  @Get('__health')
  getHealth (): string {
    console.log('health check')
    return 'ok'
  }

  @UseGuards(UserOptionalAuthGuard)
  @Get('__error')
  async getError (@Request() req): Promise<any> {
    // TODO move in middleware, cf. #53
    const data = await this.settingsService.getWebsiteRenderingVariables()
    req.renderVar = data

    throw new InternalServerErrorException()
  }

  @UseGuards(UserOptionalAuthGuard)
  @Get('/')
  async getHome (@Request() req, @Res() res: Response): Promise<any> {
    const data = await this.settingsService.getWebsiteRenderingVariables()

    const pageData = {
      ...data,
      user: req.user,
      csrf_token: req.csrfToken()
    }

    return res.render(`${data.root_theme as string}/index`, pageData)
  }

  @UseGuards(UserOptionalAuthGuard)
  @Get('*')
  async getStar (@Request() req, @Res() res: Response): Promise<any> {
    const name: string = req.params[0]
    // TODO move in middleware, cf. #53
    const data = await this.settingsService.getWebsiteRenderingVariables()
    req.renderVar = data

    // try to find a md file
    let mdFile
    try {
      mdFile = readFileSync(join(__dirname, '..', '..', '..', 'pages', `${name}.md`), 'utf8')
    } catch (e) {
      throw new NotFoundException()
    }

    // extract variables from md header, e.g. title
    const mdParts = mdFile.split(/---\n/)
    let mdVars = { title: '' }
    let mdBody = mdFile
    if (mdParts.length === 3) {
      try {
        mdVars = yaml.load(mdParts[1])
        mdBody = mdParts[2]
      } catch (_) {
        mdBody = mdFile
      }
    }

    // regular Saasform rendering variables
    const pageData = {
      ...data
    }

    const md = new MarkdownIt({ linkify: true })
    const liquid = new Liquid()

    // title from md header
    pageData.page_title = mdVars.title ?? ''
    // body first via liquid (to replace Saasform variable) then markdown-it
    pageData.page_body = md.render(await liquid.parseAndRender(mdBody, pageData))

    return res.render(`${data.root_theme as string}/page`, pageData)
  }
}
