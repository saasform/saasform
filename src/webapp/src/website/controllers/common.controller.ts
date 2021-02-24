import {
  Controller,
  Get,
  Request,
  Res
  //   Param
} from '@nestjs/common'; import { Response } from 'express'

import { renderPage } from '../utilities/render'

@Controller('/')
export class CommonController {
  @Get('/error')
  async getLogin (@Request() req, @Res() res: Response): Promise<any> {
    return renderPage(req, res, 'error')
  }
}
