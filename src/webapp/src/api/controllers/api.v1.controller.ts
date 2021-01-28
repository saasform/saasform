import { Controller, Get, UseGuards, Request, Res } from '@nestjs/common'
import { Response } from 'express'
import { LoginAuthGuard } from 'src/auth/auth.guard'

@Controller('/api/v1')
export class ApiV1Controller {
//   constructor () {}

  @Get()
  async getHello (@Request() req, @Res() res: Response): Promise<any> {
    return res.json({
      statusCode: 200,
      message: 'Hello, World!'
    })
  }

  @UseGuards(LoginAuthGuard)
  @Get('login')
  async login (@Request() req, @Res() res: Response): Promise<any> {
    return res.json({
      statusCode: 200,
      message: 'Hello, small World!'
    })
  }
}
