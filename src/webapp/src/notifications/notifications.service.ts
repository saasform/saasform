import { Injectable } from '@nestjs/common'
// import { settings } from 'cluster';
import { resolve } from 'path'
import { ConfigService } from '@nestjs/config'

import { SettingsService } from '../settings/settings.service'

import { Liquid } from 'liquidjs'

// import sgMail from '@sendgrid/mail'
import sgMail = require('@sendgrid/mail')

// const path = require('path');

const THEMES_DIR = '../../themes/'
const EMAIL_TEMPLATES_DIR = 'email'

@Injectable()
export class NotificationsService {
  private readonly apiKey: string
  private readonly sendFrom: string

  constructor (
    private readonly settingsService: SettingsService,
    public configService: ConfigService
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

  /**
   * This array contains one item per template we have.
   * Each template should return exactly the object expected by sendgrid
   * and can execute helper functions if necessary (see the `html` key).
   *
   * Each template may use a custom `data` structure that contains data
   * to be used in the template. Data can be anything and must be known
   * by the caller of the notification setting.
   */
  templates = {
    confirmation: async (settings: any, data: any) => ({
      subject: `Welcome to ${data.title as string}`,
      text: `Welcome to ${data.title as string}. Click on the following link to confirm your email. To confirm your email visit ${data.link as string}.`,
      html: await this.renderLiquidTemplate('confirm_email', settings, data) ?? ''
    }),
    resetPassword: async (settings, data: any) => ({
      subject: `Reset Password for ${data.user.email as string}`,
      text: `Click on ${data.link as string} to reset your password.`,
      html: await this.renderLiquidTemplate('reset_email', settings, data) ?? ''
    }),
    newAccount: async (settings, data: any) => ({
      subject: `New account on ${data.title as string}`,
      text: `Welcome to ${data.title as string}. Click on the following link to confirm your email. To confirm your email visit ${data.link as string}.`,
      html: await this.renderLiquidTemplate('new_account', settings, data) ?? ''
    }),
    invitedUser: async (settings, data: any) => ({
      subject: `You have been invited to ${settings.title as string}!`,
      text: `Click on ${data.link as string} to accept the invitation and set your password.`,
      html: await this.renderLiquidTemplate('invited_user', settings, data) ?? '<html></html>'
    })
  }

  async renderLiquidTemplate (template: string, settings: any, data: any): Promise<string | null> {
    try {
      const engine = new Liquid({
        root: resolve(__dirname, THEMES_DIR),
        extname: '.liquid'
      })

      return await engine.renderFile(`${settings.root_theme as string}/${EMAIL_TEMPLATES_DIR}/${template}`, { ...settings, ...data })
    } catch (err) {
      console.error('renderLiquidTemplate - error rendering email template', err, template, data)
      return null
    }
  }

  async sendEmail (to: string, template: string, data: any): Promise<Boolean> {
    const settings = await this.settingsService.getWebsiteRenderingVariables()

    if (this.isCertainlyInvalidApiKey()) {
      console.error('notificationService - sendEmail - api key not configured')
      return false
    }

    if (to === '' || template === '') {
      console.error('notificationService - sendEmail - param error', to, template)
      return false
    }

    const msg = {
      to,
      from: this.sendFrom,
      ...(await this.templates[template](settings, data))
    }

    await (async () => {
      try {
        await sgMail.send(msg)
      } catch (error) {
        console.error('notificationService - sendEmail - Error while sending email', error)

        if (error.response != null) {
          console.error('notificationService - sendEmail - Error while sending email', error.response.body)
          return false
        }
      }
    })()

    return true
  }
}
