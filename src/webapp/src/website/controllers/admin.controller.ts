import {
  Controller,
  Get,
  Request,
  Res,
  UseGuards,
  NotFoundException,
  Param
} from '@nestjs/common'
import { Response } from 'express'
import { Liquid } from 'liquidjs'
import * as MarkdownIt from 'markdown-it'

import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import * as yaml from 'js-yaml'

import { SettingsService } from '../../settings/settings.service'
import { AdminRequiredAuthGuard } from '../../auth/auth.guard'

import { renderPage } from '../utilities/render'

@Controller('admin')
@UseGuards(AdminRequiredAuthGuard)
export class AdminController {
  constructor (
    private readonly settingsService: SettingsService
  ) {}

  @Get('emails?')
  getAllEmail (@Request() req /* @Res() res: Response, */): string {
    const result: string[] = []
    readdirSync('./emails').forEach(file => {
      if (file.endsWith('.md')) {
        const name = file.replace('.md', '')
        result.push(`<a href="/admin/email/${name}">${name}</a>`)
      }
    })
    return result.join('<br/>')
  }

  @Get('emails?/:email')
  async getEmail (@Request() req, @Res() res: Response, @Param('email') email: string): Promise<any> {
    const name: string = email

    // try to find a md file
    let mdFile
    try {
      mdFile = readFileSync(join(__dirname, '..', '..', '..', 'emails', `${name}.md`), 'utf8')
    } catch (e) {
      throw new NotFoundException()
    }

    // extract variables from md header, e.g. title
    const mdParts = mdFile.split(/---\n/)
    let mdVars = { subject: '', button_url: '', action_url: '' }
    let mdBody = mdFile
    if (mdParts.length === 3) {
      try {
        mdVars = yaml.load(mdParts[1])
        mdBody = mdParts[2]
      } catch (_) {
        mdBody = mdFile
      }
    }

    const md = new MarkdownIt({ linkify: true, html: true })
    const liquid = new Liquid({ root: join(__dirname, '..', '..', '..', 'emails'), extname: '.liquid' })

    // data passed to render subject & body
    const varData = {
      ...req.websiteData,
      action_url: 'https://example.com/'
    }

    const pageData = {
      // title from md header
      email_subject: mdVars.subject != null ? await liquid.parseAndRender(mdVars.subject, varData) : '',
      // body first via liquid (to replace Saasform variable) then markdown-it
      email_body: md.render(await liquid.parseAndRender(mdBody, varData))
    }

    return renderPage(req, res, '../../emails/default', pageData)
  }

  @Get('*')
  getAdmin (@Res() res: Response): void {
    return res.sendFile('index.html', {
      root: join(__dirname, '..', '..', '..', 'admin')
    })
  }
}
