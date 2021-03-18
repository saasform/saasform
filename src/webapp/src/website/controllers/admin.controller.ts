import {
  Controller,
  Get,
  Request,
  Res,
  UseGuards,
  NotFoundException,
  InternalServerErrorException,
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
  getAllEmail (@Request() req, /*@Res() res: Response,*/): string {
    let result: Array<string> = [];
    readdirSync('./emails').forEach(file => {
      if (file.endsWith('.md')) {
        const name = file.replace('.md', '')
        result.push(`<a href="/admin/email/${name}">${name}</a>`)
      }
    });
    return result.join('<br/>');
  }

  @Get('emails?/:email')
  getEmail (@Request() req, /*@Res() res: Response,*/ @Param('email') email: string): string {
    return `email: ${email}`;
  }

  @Get('*')
  getAdmin(@Res() res: Response) {
    return 'Admin dashboard coming soon!'
    // return res.sendFile('index.html', {
    //   root: join(__dirname, '..', '..', 'admin'),
    // });
  }
}
