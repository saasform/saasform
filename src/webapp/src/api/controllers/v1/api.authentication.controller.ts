import { Controller, Get, Post, Request, Res, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Response } from 'express'
import { SettingsService } from '../../../settings/settings.service'
import { AuthService } from '../../../auth/auth.service'
import { PaymentsService } from '../../../payments/services/payments.service'
import { UserError } from '../../../utilities/common.model'
import { GoogleGuard } from '../../../auth/auth.guard'
import { UserCredentialsService } from '../../../accounts/services/userCredentials.service'

@ApiTags('Authentication')
@Controller('/api/v1')
export class ApiV1AutheticationController {
  constructor (
    private readonly authService: AuthService,
    private readonly settingsService: SettingsService,
    private readonly paymentsService: PaymentsService,
    private readonly userCredentialsService: UserCredentialsService
  ) {}

  async issueJwtAndRedirect (req, res, user): Promise<Response> {
    const requestUser = req.user != null ? req.user : await this.authService.getTokenPayloadFromUserModel(user)
    if (requestUser == null) {
      console.error('API V1 - issueJwtAndRediret - requestUser not valid')
      return res.status(500).json({
        statusCode: 500,
        message: 'Server error'
      })
    }

    const jwt = await this.authService.setJwtCookie(req, res, requestUser)
    const redirect = await this.settingsService.getActualRedirectAfterLogin(requestUser, req.query.next, jwt)
    return res.status(302).json({
      statusCode: 302,
      message: 'Found',
      redirect
    })
  }

  @Post('login')
  async handleLogin (@Request() req, @Res() res: Response): Promise<any> {
    const { email, password } = req.body

    if (email == null || password == null) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Missing parameters (email or password)'
      })
    }

    const user = await this.authService.validateUser(email, password)
    if (user == null) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Unauthorized'
      })
    }

    return await this.issueJwtAndRedirect(req, res, user)
  }

  @Post('get-credential-type')
  async handleGetCredentialType (@Request() req, @Res() res: Response): Promise<any> {
    const { email } = req.body

    if (email == null) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Missing parameters (email)'
      })
    }

    const credential = await this.userCredentialsService.findUserCredentialByEmail(email)

    if (credential == null) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Not found'
      })
    }

    const credentialTypes = Object.keys(credential.json ?? {})

    return res.status(200).json({
      statusCode: 200,
      message: { credentialTypes }
    })
  }

  @Post('signup')
  async handleSignup (@Request() req, @Res() res: Response): Promise<any> {
    const response = res
    const { email, password } = req.body

    if (email == null || password == null) {
      return response.status(400).json({
        statusCode: 400,
        message: 'Missing parameters (email or password)'
      })
    }

    const user = await this.authService.registerUser(req)
    if (user instanceof UserError || user == null) {
      return response.status(409).json({
        statusCode: 409,
        message: 'Already registered'
      })
    }

    return await this.issueJwtAndRedirect(req, res, user)
  }

  @Get('/public-key')
  async getPublicKey (@Request() req, @Res() res: Response): Promise<any> {
    const publicKey = await this.settingsService.getJWTPublicKey()

    return res.status(200).json({
      statusCode: 200,
      message: publicKey
    })
  }

  @UseGuards(GoogleGuard)
  @Post('google-signin')
  async handleGoogleSignin (@Request() req, @Res() res: Response): Promise<any> {
    // const googleUser = req.googleUser
    // const user = await this.authService.onGoogleSignin(googleUser.email, googleUser.sub)
    if (req.user == null) {
      return res.status(409).json({
        statusCode: 409,
        message: "Ops! You don't have any account."
      })
    }

    return await this.issueJwtAndRedirect(req, res, null)
  }
}
