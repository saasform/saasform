import { Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { SettingsService } from '../settings/settings.service'

import { Liquid } from 'liquidjs'
import * as MarkdownIt from 'markdown-it'

import { readFileSync } from 'fs'
import { join } from 'path'
import * as yaml from 'js-yaml'

import * as sgMail from '@sendgrid/mail'

const EMAIL_TEMPLATES_DIR = '../../emails'

@Injectable()
export class NotificationsService {
  private readonly apiKey: string
  private readonly sendFrom: string

  constructor (
    private readonly settingsService: SettingsService,
    private readonly configService: ConfigService
  ) {
    this.apiKey = this.configService.get<string>('SENDGRID_API_KEY', '')
    this.sendFrom = this.configService.get<string>('SENDGRID_SEND_FROM', '')
    if (!this.isCertainlyInvalidApiKey()) {
      sgMail.setApiKey(this.apiKey)
    }
  }

  isCertainlyInvalidApiKey (): boolean {
    return this.apiKey === '' || this.apiKey.endsWith('xxx')
  }

  async render (template: string, data: any): Promise<any> {
    // try to find a md file
    let mdFile
    try {
      mdFile = readFileSync(join(__dirname, EMAIL_TEMPLATES_DIR, `${template}.md`), 'utf8')
    } catch (e) {
      throw new NotFoundException()
    }

    const websiteData = await this.settingsService.getWebsiteRenderingVariables()

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
    const liquidHtml = new Liquid({ root: join(__dirname, EMAIL_TEMPLATES_DIR), extname: '.liquid' })
    const liquidTxt = new Liquid({ root: join(__dirname, EMAIL_TEMPLATES_DIR), extname: '.txt' })

    // data passed to render subject & body
    const varData = {
      ...websiteData,
      ...data
    }

    const subject = mdVars.subject != null ? await liquidHtml.parseAndRender(mdVars.subject, varData) : ''
    const html = await liquidHtml.renderFile('../emails/default', {
      subject,
      html: md.render(await liquidHtml.parseAndRender(mdBody, varData)),
      ...varData
    })

    return {
      // title from md header
      subject,
      // body first via liquid (to replace Saasform variable) then markdown-it
      html,
      // txt version of the email
      text: await liquidTxt.parseAndRender(mdBody, varData)
    }
  }

  async sendEmail (to: string, template: string, data: any): Promise<Boolean> {
    if (this.isCertainlyInvalidApiKey()) {
      console.error('notificationService - sendEmail - api key not configured')
      return false
    }

    if (to === '' || template === '') {
      console.error('notificationService - sendEmail - param error', to, template)
      return false
    }

    let renderedEmail
    try {
      renderedEmail = await this.render(template, data)
    } catch (error) {
      console.error('notificationService::sendEmail - Error rendering', error)
      return false
    }

    const settings = await this.settingsService.getWebsiteRenderingVariables()
    const msg = {
      to,
      from: settings.email ?? this.sendFrom,
      ...renderedEmail
    }

    await (async () => {
      try {
        await sgMail.send(msg)
      } catch (error) {
        console.error('notificationService - sendEmail - Error while sending email', error)

        if (error.response != null) {
          console.error('notificationService - sendEmail - Error while sending email', error.response.body)
        }
        return false
      }
    })()

    return true
  }
}
