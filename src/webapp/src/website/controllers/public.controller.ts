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

import { BaseController } from '../../utilities/base.controller'
import { SettingsService } from '../../settings/settings.service'
import { UserOptionalAuthGuard } from '../../auth/auth.guard'

import { renderPage } from '../utilities/render'

@Controller()
export class PublicController extends BaseController {
  constructor (
    private readonly settingsService: SettingsService
  ) {
    super()
  }

  @UseGuards(UserOptionalAuthGuard)
  @Get('__health')
  getHealth (): string {
    console.log('health check')
    return 'ok'
  }

  @UseGuards(UserOptionalAuthGuard)
  @Get('__error')
  async getError (@Request() req): Promise<any> {
    throw new InternalServerErrorException()
  }

  @UseGuards(UserOptionalAuthGuard)
  @Get('/')
  async getHome (@Request() req, @Res() res: Response): Promise<any> {
    const homeRedirect = await this.settingsService.getHomepageRedirectUrl()
    if (homeRedirect != null) {
      return res.redirect(homeRedirect)
    }
    return renderPage(req, res, 'index')
  }

  @UseGuards(UserOptionalAuthGuard)
  @Get('*')
  async getStar (@Request() req, @Res() res: Response): Promise<any> {
    const name: string = req.params[0]

    // try to find a md file
    let mdFile
    try {
      mdFile = readFileSync(join(this.getPagesDir(req), `${name}.md`), 'utf8')
    } catch (e) {
      throw new NotFoundException()
    }

    // extract variables from md header, e.g. title
    const mdParts = mdFile.split(/---\n/)
    let mdVars = { title: '', layout: '' }
    let mdBody = mdFile
    if (mdParts.length === 3) {
      try {
        mdVars = yaml.load(mdParts[1])
        mdBody = mdParts[2]
      } catch (_) {
        mdBody = mdFile
      }
    }

    const md = new MarkdownIt({ linkify: true })
    const liquid = new Liquid()

    const pageData = {
      // title from md header
      page_title: mdVars.title ?? '',
      // body first via liquid (to replace Saasform variable) then markdown-it
      page_body: md.render(await liquid.parseAndRender(mdBody, req.websiteData))
    }

    return renderPage(req, res, mdVars.layout ?? 'page', pageData)
  }
}
