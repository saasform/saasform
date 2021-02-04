import { Controller, Get, Post, UseGuards, Request, Res } from '@nestjs/common'
import { Response } from 'express'
import { SettingsService } from '../../../settings/settings.service'
import { LoginAuthGuard } from '../../../auth/auth.guard'
import { AuthService } from '../../../auth/auth.service'

@Controller('/api/v1')
export class ApiV1AutheticationController {
  constructor (
    private readonly authService: AuthService,
    private readonly settingsService: SettingsService
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
      console.log('returning 409')
      return response.status(409).json({
        statusCode: 409,
        message: 'Already registered'
      })
    }

    const requestUser = await this.authService.getTokenPayloadFromUserModel(user)
    if (requestUser == null) {
      console.error('API V1 - handleSignup - requestUser not valid')
      return response.status(500).json({
        statusCode: 500,
        message: 'Server error'
      })
    }

    await this.authService.setJwtCookie(req, res, requestUser)
    // SETTINGS
    // const redirect = await this.settingsService.getRedirectAfterLogin()
    const redirect = '/'

    return response.status(302).json({
      statusCode: 302,
      message: 'Found',
      redirect
    })
  }

  @Get('/public-key')
  async getPublicKey (@Request() req, @Res() res: Response): Promise<any> {
    const publicKey = await this.settingsService.getJWTPublicKey()

    return res.status(200).json({
      statusCode: 200,
      message: publicKey
    })
  }
}
