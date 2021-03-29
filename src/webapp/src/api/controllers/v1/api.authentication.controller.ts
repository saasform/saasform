import { Controller, Get, Post, Request, Res } from '@nestjs/common'
import { Response } from 'express'
import { SettingsService } from '../../../settings/settings.service'
import { AuthService } from '../../../auth/auth.service'
import { PaymentsService } from '../../../payments/services/payments.service'
import { UserError } from '../../../utilities/common.model'

@Controller('/api/v1')
export class ApiV1AutheticationController {
  constructor (
    private readonly authService: AuthService,
    private readonly settingsService: SettingsService,
    private readonly paymentsService: PaymentsService
  ) {}

  @Get()
  async getHello (@Request() req, @Res() res: Response): Promise<any> {
    return res.json({
      statusCode: 200,
      message: 'Hello, World!'
    })
  }

  async issueJwtAndRedirect (req, res, user): Promise<Response> {
    const requestUser = await this.authService.getTokenPayloadFromUserModel(user)
    if (requestUser == null) {
      console.error('API V1 - issueJwtAndRediret - requestUser not valid')
      return res.status(500).json({
        statusCode: 500,
        message: 'Server error'
      })
    }

    const requestUserWithSubscription = await this.authService.updateActiveSubscription(requestUser)
    if (requestUserWithSubscription == null) {
      console.error('API V1 - issueJwtAndRediret - error while add subscription to token')
    }

    await this.authService.setJwtCookie(req, res, requestUserWithSubscription ?? requestUser)

    let redirect = ''
    // if subscription is not valid redirect to the billing page
    const payment = await this.paymentsService.getActivePayments(requestUser.account_id)
    if (await this.paymentsService.isPaymentValid(payment) === false) {
      redirect = '/user/billing'
    } else {
      redirect = await this.settingsService.getRedirectAfterLogin()
    }

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

    const user = await this.authService.registerUser(req.body)
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
}
