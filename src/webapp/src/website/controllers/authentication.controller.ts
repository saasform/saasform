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
      csrfToken: req.csrfToken()
    }

    return res.render(`${data.themeRoot as string}/login`, pageData)
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
      csrfToken: req.csrfToken()
    }

    return res.render(`${data.themeRoot as string}/signup`, pageData)
  }

  @Post('/signup')
  async postSignup (@Request() req, @Res() res: Response): Promise<any> {
    const { email, password, confirmation, account } = req.body

    if (password !== confirmation) {
      // TODO: redirect to error page
      res.redirect('/error')
    }

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

  // http://localhost:3000/verify-email/pIW5IIOs
  @UseGuards(UserOptionalAuthGuard)
  @Get('verify-email/:token')
  async confirmEmail (@Request() req, @Res() res: Response, @Param('token') token: string): Promise<any> {
    const data = await this.settingsService.getWebsiteRenderingVariables()
    try {
      const user = await this.usersService.confirmEmail(token)

      if (user == null || user.id === null) {
        console.error('confirmEmail - User not found')
        throw new Error('User not found')
      }

      const account = await this.accountsService.findByUserId(user.id)

      if (account == null) {
        console.error('confirmEmail - Account not found')
        throw new Error('Account not found')
      }

      if (req.user != null) {
        // auto login (only if user was already logged in)
        const requestUser = await this.authService.getTokenPayloadFromUserModel({ user, credential: null, account })
        if (requestUser == null) {
          console.error('confirmEmail - error while reissuing token')
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
      return res.render(`${data.themeRoot as string}/500`, data)
    }
  }
}
