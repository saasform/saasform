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
import { UserOptionalAuthGuard } from '../..//auth/auth.guard'
import { SettingsService } from '../../settings/settings.service'
import { AuthService } from '../..//auth/auth.service'
import { UsersService } from '../../accounts/services/users.service'
import { AccountsService } from '../../accounts/services/accounts.service'

import { renderPage } from '../utilities/render'

@Controller('/')
@UseGuards(UserOptionalAuthGuard)
export class AuthenticationController {
  constructor (
    private readonly authService: AuthService,
    private readonly accountsService: AccountsService,
    private readonly usersService: UsersService,
    private readonly settingsService: SettingsService
  ) {}

  async issueJwtAndRediret (req, res, user): Promise<Response> {
    const requestUser = await this.authService.getTokenPayloadFromUserModel(user)
    if (requestUser == null) {
      console.error('authenticationController - handleSignup - requestUser not valid')
      return res.redirect('/error')
    }

    await this.authService.setJwtCookie(req, res, requestUser)

    const baseUrl = await this.settingsService.getBaseUrl()
    const appUrl = await this.settingsService.getRedirectAfterLogin()

    // prevent open redirects
    const next = req.query.next
    if (next != null) {
      if (
        // relative path
        next[0] === '/' ||
        // absolute url to Saasform
        next.startsWith(baseUrl) === true ||
        // absolute url to SaaS
        next.startsWith(appUrl) === true
      ) {
        return res.redirect(next)
      }
    }

    return res.redirect(appUrl)
  }

  @Get('/login')
  async getLogin (@Request() req, @Res() res: Response): Promise<any> {
    if (req.user !== false) {
      const redirect = await this.settingsService.getRedirectAfterLogin()
      return res.redirect(redirect)
    }
    return renderPage(req, res, 'login')
  }

  // @UseGuards(LoginAuthGuard)
  @Post('/login')
  async postLogin (@Request() req, @Res() res: Response): Promise<any> {
    const { email, password } = req.body

    if (email == null) {
      return renderPage(req, res, 'login', {
        error: {
          email: 'Email not valid.'
        }
      })
    }

    if (password == null) {
      return renderPage(req, res, 'login', {
        error: {
          password: 'Password not valid.'
        }
      })
    }

    const user = await this.authService.validateUser(email, password)
    if (user == null) {
      return renderPage(req, res, 'login', {
        error: {
          password: 'Invalid username or password'
        }
      })
    }

    return await this.issueJwtAndRediret(req, res, user)
  }

  @Get('/signup')
  async getSignup (@Request() req, @Res() res: Response): Promise<any> {
    if (req.user !== false) {
      const redirect = await this.settingsService.getRedirectAfterLogin()
      return res.redirect(redirect)
    }
    return renderPage(req, res, 'signup')
  }

  @Post('/signup')
  async postSignup (@Request() req, @Res() res: Response): Promise<any> {
    const { email, password } = req.body
    if (email == null) {
      return renderPage(req, res, 'signup', {
        error: {
          email: 'Email not valid.'
        }
      })
    }

    if (password == null) {
      return renderPage(req, res, 'signup', {
        error: {
          password: 'Password not valid.'
        }
      })
    }

    const user = await this.authService.registerUser(req.body)
    if (user == null) {
      return renderPage(req, res, 'signup', {
        error: {
          email: 'User already registered. Log in.'
        }
      })
    }

    return await this.issueJwtAndRediret(req, res, user)
  }

  @Get('verify-email/:token')
  async verifyEmailToken (@Request() req, @Res() res: Response, @Param('token') token: string): Promise<any> {
    const data = req.websiteData
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

  @Get('/password-reset')
  async resetPassword (@Request() req, @Res() res: Response): Promise<any> {
    if (req.user !== false) {
      return res.redirect('/user/security')
    }
    return renderPage(req, res, 'password-reset')
  }

  @Post('/password-reset')
  async postResetPassword (@Request() req, @Res() res: Response): Promise<any> {
    const { email } = req.body

    await this.usersService.sendResetPasswordEmail(email)
    return renderPage(req, res, 'password-reset',
      {
        alert: {
          type: 'notice',
          text: 'A reset email has been sent'
        }
      })
  }

  @Get('/password-change/:token')
  async resetPasswordToken (@Request() req, @Res() res: Response, @Param('token') token: string): Promise<any> {
    if (req.user !== false) {
      return res.redirect('/user/security')
    }
    return renderPage(req, res, 'password-change', { token })
  }

  @Post('/password-change/:token')
  async postResetPasswordToken (@Request() req, @Res() res: Response): Promise<any> {
    const { token, password, confirmation } = req.body

    let error
    if (password == null) {
      error = {
        password: 'Password not valid.'
      }
      return renderPage(req, res, 'password-change', { token, error })
    }

    if (password !== confirmation) {
      error = {
        confirmation: 'Confirmation password doesn\'t match'
      }
      return renderPage(req, res, 'password-change', { token, error })
    }

    await this.usersService.resetPassword(token, password)

    return res.redirect('/login') // TODO: make this less hard coded
  }
}
