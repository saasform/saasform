import { Controller, Get, Post, UseGuards, Request, Res } from '@nestjs/common'
import { Response } from 'express'
import { LoginAuthGuard } from 'src/auth/auth.guard'
import { AuthService } from 'src/auth/auth.service'

@Controller('/api/v1')
export class ApiV1Controller {
  constructor (
    private readonly authService: AuthService
  ) {}

  @Get()
  async getHello (@Request() req, @Res() res: Response): Promise<any> {
    return res.json({
      statusCode: 200,
      message: 'Hello, World!'
    })
  }

  @UseGuards(LoginAuthGuard)
  @Post('login')
  async handleLogin (@Request() req, @Res() res: Response): Promise<any> {
    return res.json({
      statusCode: 200,
      message: 'Hello, small World!'
    })
  }

  @Post('signup')
  async handleSignup (@Request() req, @Res() res: Response): Promise<any> {
    const response = res
    const { email, password, account } = req.body

    if (email == null || password == null) {
      return response.json({
        statusCode: 400,
        message: 'Missing parameters (email or password)'
      })
    }

    const user = await this.authService.registerUser(email, password, account)
    if (user == null) {
      return response.json({
        statusCode: 409,
        message: 'Already registered'
      })
    }

    const requestUser = await this.authService.getTokenPayloadFromUserModel(user)
    if (requestUser == null) {
      console.error('API V1 - handleSignup - requestUser not valid')
      return response.json({
        statusCode: 500,
        message: 'Server error'
      })
    }

    await this.authService.setJwtCookie(req, res, requestUser)
    // SETTINGS
    // const redirect = await this.settingsService.getRedirectAfterLogin()
    const redirect = '/'

    return response.json({
      statusCode: 302,
      message: 'Found',
      redirect
    })
  }
}
