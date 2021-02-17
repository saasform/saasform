import {
  Controller,
  Get,
  Request,
  Res,
  Post,
  UseGuards,
  Param
//   Param
} from '@nestjs/common'; import { Response } from 'express'
import { LoginAuthGuard, UserOptionalAuthGuard } from '../..//auth/auth.guard'
import { SettingsService } from '../../settings/settings.service'
import { AuthService } from '../..//auth/auth.service'
import { UsersService } from '../../accounts/services/users.service'
import { AccountsService } from '../../accounts/services/accounts.service'

@Controller('/')
export class AuthenticationController {
  constructor (
    private readonly authService: AuthService,
    private readonly accountsService: AccountsService,
    private readonly usersService: UsersService,
    private readonly settingsService: SettingsService
  ) {}

  @Get('/login')
  async getLogin (@Request() req, @Res() res: Response): Promise<any> {
    const data = await this.settingsService.getWebsiteRenderingVariables()
    const pageData = {
      ...data,
      csrf_token: req.csrfToken()
    }

    return res.render(`${data.root_theme as string}/login`, pageData)
  }

  @UseGuards(LoginAuthGuard)
  @Post('/login')
  async postLogin (@Request() req, @Res() res: Response): Promise<any> {
    const next = req.query.next
    if (next != null && next[0] === '/') {
      return res.redirect(next)
    } else {
      const redirect = await this.settingsService.getRedirectAfterLogin() ?? '/'
      return res.redirect(redirect)
    }
  }

  @Get('/signup')
  async getSignup (@Request() req, @Res() res: Response): Promise<any> {
    const data = await this.settingsService.getWebsiteRenderingVariables()
    const pageData = {
      ...data,
      csrf_token: req.csrfToken()
    }

    return res.render(`${data.root_theme as string}/signup`, pageData)
  }

  @Post('/signup')
  async postSignup (@Request() req, @Res() res: Response): Promise<any> {
    const { email, password, account } = req.body

    const user = await this.authService.registerUser(email, password, account)
    if (user == null) { // TODO: redirect to error page
      return res.json({
        statusCode: 409,
        message: 'Already registered'
      })
    }

    const requestUser = await this.authService.getTokenPayloadFromUserModel(user)
    if (requestUser == null) {
      console.error('authenticationController - handleSignup - requestUser not valid')
      return res.redirect('/error')
    }

    await this.authService.setJwtCookie(req, res, requestUser)

    const next = req.query.next
    if (next != null && next[0] === '/') {
      return res.redirect(next)
    } else {
      const redirect = await this.settingsService.getRedirectAfterLogin() ?? '/'
      return res.redirect(redirect)
    }
  }

  @UseGuards(UserOptionalAuthGuard)
  @Get('verify-email/:token')
  async verifyEmailToken (@Request() req, @Res() res: Response, @Param('token') token: string): Promise<any> {
    const data = await this.settingsService.getWebsiteRenderingVariables()
    try {
      const user = await this.usersService.confirmEmail(token)

      if (user == null || user.id === null) {
        console.error('verifyEmailToken - User not found')
        throw new Error('User not found')
      }

      const account = await this.accountsService.findByUserId(user.id)

      if (account == null) {
        console.error('verifyEmailToken - Account not found')
        throw new Error('Account not found')
      }

      if (req.user != null) {
        // auto login (only if user was already logged in)
        const requestUser = await this.authService.getTokenPayloadFromUserModel({ user, credential: null, account })
        if (requestUser == null) {
          console.error('verifyEmailToken - error while reissuing token')
          throw new Error('User not found')
        }
        await this.authService.setJwtCookie(req, res, requestUser)

        const redirect = await this.settingsService.getRedirectAfterLogin()
        res.redirect(redirect)
      } else {
        res.redirect('/')
      }
    } catch (error) {
      console.error(error)
      return res.render(`${data.root_theme as string}/500`, data)
    }
  }

  @Get('/logout')
  async logout (@Request() req, @Res() res: Response): Promise<any> {
    res.clearCookie('__session', { domain: req.hostname })
    req.logout()
    res.redirect('/')
  }

  @Get('/reset-password')
  async resetPassword (@Request() req, @Res() res: Response): Promise<any> {
    const data = await this.settingsService.getWebsiteRenderingVariables()
    const pageData = {
      ...data,
      csrf_token: req.csrfToken()
    }

    return res.render(`${data.root_theme as string}/reset-password`, pageData)
  }

  @Post('/reset-password')
  async postResetPassword (@Request() req, @Res() res: Response): Promise<any> {
    const { email } = req.body

    await this.usersService.sendResetPasswordEmail(email)
    res.redirect('/') // TODO
  }

  @Get('reset-password/:token')
  async resetPasswordToken (@Request() req, @Res() res: Response, @Param('token') token: string): Promise<any> {
    const data = await this.settingsService.getWebsiteRenderingVariables()
    const pageData = {
      ...data,
      token,
      csrf_token: req.csrfToken()
    }

    return res.render(`${data.root_theme as string}/resetPasswordToken`, pageData)
  }

  @Post('/reset-password-finish')
  async postResetPasswordToken (@Request() req, @Res() res: Response): Promise<any> {
    const { token, password, confirmation } = req.body

    if (password !== confirmation) {
      return res.redirect('/error')
    }

    await this.usersService.resetPassword(token, password)

    return res.redirect('/login') // TODO: make this less hard coded
  }
}
