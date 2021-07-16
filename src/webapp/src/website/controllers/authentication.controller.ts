import {
  Controller,
  Get,
  Request,
  Res,
  Post,
  UseGuards,
  Param
} from '@nestjs/common'
import { Response } from 'express'
import { UserOptionalAuthGuard, AzureAdGuard, MiraclGuard, OktaGuard } from '../..//auth/auth.guard'
import { SettingsService } from '../../settings/settings.service'
import { AuthService } from '../..//auth/auth.service'
import { UsersService } from '../../accounts/services/users.service'
import { AccountsService } from '../../accounts/services/accounts.service'
import { PaymentsService } from '../../payments/services/payments.service'
import { UserError } from '../../utilities/common.model'

import { renderPage } from '../utilities/render'

@Controller('/')
@UseGuards(UserOptionalAuthGuard)
export class AuthenticationController {
  constructor (
    private readonly authService: AuthService,
    private readonly accountsService: AccountsService,
    private readonly paymentsService: PaymentsService,
    private readonly usersService: UsersService,
    private readonly settingsService: SettingsService
  ) {}

  async issueJwtAndRediret (req, res, user): Promise<Response> {
    const requestUser = await this.authService.getTokenPayloadFromUserModel(user)
    if (requestUser == null) {
      console.error('authenticationController - issueJwtAndRediret - requestUser not valid')
      return res.redirect('/error')
    }

    await this.authService.setJwtCookie(req, res, requestUser)

    const appUrl = await this.settingsService.getActualRedirectAfterLogin(requestUser, req.query.next)
    return res.redirect(appUrl)
  }

  @Get('/login')
  async getLogin (@Request() req, @Res() res: Response): Promise<any> {
    if (req.user !== false) {
      const redirect = await this.settingsService.getActualRedirectAfterLogin(req.user, req.query.next)
      return res.redirect(redirect)
    }
    return renderPage(req, res, 'login', {
      next_url: await this.settingsService.getNextUrl(req.query.next)
    })
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
      const redirect = await this.settingsService.getActualRedirectAfterLogin(req.user, req.query.next)
      return res.redirect(redirect)
    }
    return renderPage(req, res, 'signup', {
      next_url: await this.settingsService.getNextUrl(req.query.next)
    })
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
    if (user instanceof UserError || user == null) {
      let error
      switch (user?.name) {
        case 'duplicate_email':
          error = { email: 'Email already registered. Log in.' }
          break
        case 'duplicate_username':
          error = { username: 'Username already registered. Log in.' }
          break
        default:
          error = { email: 'Error while registering user.' }
      }
      return renderPage(req, res, 'signup', {
        error
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

      if (req.user != null && req.user !== false) {
        // auto login (only if user was already logged in)
        const requestUser = await this.authService.getTokenPayloadFromUserModel({ user, credential: null, account })
        if (requestUser == null) {
          console.error('verifyEmailToken - error while reissuing token')
          throw new Error('User not found')
        }
        await this.authService.setJwtCookie(req, res, requestUser)

        const redirect = await this.settingsService.getActualRedirectAfterLogin(requestUser, req.query.next)
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
    const options = await this.authService.getJwtCookieOptions(req)
    res.clearCookie('__session', options)
    req.logout()
    res.redirect(await this.settingsService.getTopLevelUrl())
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

  /* SOCIALS */

  @UseGuards(AzureAdGuard)
  @Get('/auth/azure')
  async azureAdRedirectTo (@Request() req, @Res() res: Response): Promise<any> {
  }

  @UseGuards(AzureAdGuard)
  @Post('/auth/azure/callback')
  async azureAdReturnFrom (@Request() req, @Res() res: Response): Promise<any> {
    if (req.user !== false) {
      const redirect = await this.settingsService.getActualRedirectAfterLogin(req.user, req.query.next)
      return res.redirect(redirect)
    }
    return res.redirect('/login')
  }

  @UseGuards(MiraclGuard)
  @Get('/auth/miracl')
  async miraclRedirectTo (@Request() req, @Res() res: Response): Promise<any> {
  }

  @UseGuards(MiraclGuard)
  @Get('/auth/miracl/callback')
  async miraclReturnFrom (@Request() req, @Res() res: Response): Promise<any> {
    if (req.user !== false) {
      const redirect = await this.settingsService.getActualRedirectAfterLogin(req.user, req.query.next)
      return res.redirect(redirect)
    }
    return res.redirect('/login')
  }

  @UseGuards(OktaGuard)
  @Get('/auth/okta')
  async oktaRedirectTo (@Request() req, @Res() res: Response): Promise<any> {
  }

  @UseGuards(OktaGuard)
  @Get('/auth/okta/callback')
  async oktaReturnFrom (@Request() req, @Res() res: Response): Promise<any> {
    if (req.user !== false) {
      const redirect = await this.settingsService.getActualRedirectAfterLogin(req.user, req.query.next)
      return res.redirect(redirect)
    }
    return res.redirect('/login')
  }
}
