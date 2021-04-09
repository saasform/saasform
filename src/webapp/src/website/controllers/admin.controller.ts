import {
  Controller,
  Get,
  Request,
  Res,
  UseGuards,
  Param
} from '@nestjs/common'
import { Response } from 'express'
import { readdirSync } from 'fs'
import { join } from 'path'

import { NotificationsService } from '../../notifications/notifications.service'
import { AdminRequiredAuthGuard } from '../../auth/auth.guard'

@Controller('admin')
@UseGuards(AdminRequiredAuthGuard)
export class AdminController {
  constructor (
    private readonly notificationsService: NotificationsService
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
  async getEmail (@Param('email') email: string): Promise<string> {
    const emailData = {
      // the recipient
      user: {
        email: 'recipient@saasform.dev'
      },
      // sender, when available (e.g., user_invite)
      sender: {
        display_name: 'sender@saasform.dev'
      },
      action_url: 'https://saasform.dev'
    }
    const renderedEmail = await this.notificationsService.render(email, emailData)

    // console.log(renderedEmail.text)

    return renderedEmail.html
  }

  @Get('*')
  getAdmin (@Res() res: Response): void {
    return res.sendFile('index.html', {
      root: join(__dirname, '..', '..', '..', 'admin')
    })
  }
}
