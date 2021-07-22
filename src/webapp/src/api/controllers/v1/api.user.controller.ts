import { Controller, Get, Post, Put, Delete, UseGuards, Request, Res, Param } from '@nestjs/common'
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger'
import { Response } from 'express'
import { SettingsService } from '../../../settings/settings.service'
import { AccountsService } from '../../../accounts/services/accounts.service'
import { PlansService } from '../../../payments/services/plans.service'
import { UsersService } from '../../../accounts/services/users.service'

import { UserRequiredAuthGuard } from '../../../auth/auth.guard'
import { UserCredentialsService } from '../../../accounts/services/userCredentials.service'

@ApiBearerAuth()
@ApiCookieAuth()
@ApiTags('Settings page')
@Controller('/api/v1/user')
export class ApiV1UserController {
  constructor (
    private readonly usersService: UsersService,
    private readonly settingsService: SettingsService,
    private readonly accountsService: AccountsService,
    private readonly plansService: PlansService,
    private readonly userCredentialService: UserCredentialsService
  ) {}

  @UseGuards(UserRequiredAuthGuard)
  @Post('password-change')
  async handlePasswordChange (@Request() req, @Res() res: Response): Promise<any> {
    const { password } = req.body
    const passwordConfirmation = req.body['password-confirm']
    const passwordNew = req.body['password-new']

    if (password == null) {
      return res.json({
        statusCode: 400,
        error: 'Password not valid'
      })
    }
    if (passwordNew !== passwordConfirmation) {
      return res.json({
        statusCode: 400,
        error: 'Confirmation password doesn\'t match'
      })
    }

    let result: Boolean

    try {
      result = await this.usersService.changePassword(req.user.email, password, passwordNew)
    } catch (error) {
      console.error('ApiV1UserController - handlePasswordChange', error)
      return res.json({
        statusCode: 500,
        message: `err ${error.message as string}`
      })
    }

    if (result !== true) {
      return res.json({
        statusCode: 400,
        error: 'Error while changing password'
      })
    }

    return res.json({
      statusCode: 200,
      message: 'Password changed'
    })
  }

  @UseGuards(UserRequiredAuthGuard)
  @Put(':userId')
  async updateUserProfile (@Request() req, @Res() res: Response, @Param('userId') userId): Promise<any> {
    const updatedUser = await this.usersService.updateUserProfile(req.body, userId)

    if (updatedUser == null) {
      console.error('UserController - updateUserProfile - User not updated', req.user.account_id)
      return res.json({
        statusCode: 500,
        error: 'User not updated'
      })
    }

    const { company } = req.body
    if (company != null && company !== '') {
      const account = await this.accountsService.findById(req.user.account_id)

      if (account == null) {
        console.error('UserController - updateUserProfile - Account not found', req.user.account_id)
        return res.json({
          statusCode: 400,
          error: 'Account not found'
        })
      }

      const updatedAccount = await this.accountsService.setCompanyName(account, company)

      if (updatedAccount == null) {
        console.error('UserController - updateUserProfile - Account not updated', req.user.account_id)
        return res.json({
          statusCode: 500,
          error: 'Account not updated'
        })
      }
    }

    return res.json({
      statusCode: 200,
      message: 'Profile updated'
    })
  }

  @UseGuards(UserRequiredAuthGuard)
  @Delete(':userId')
  async handleDeleteUser (@Request() req, @Res() res: Response, @Param('userId') userId): Promise<any> {
    if (userId == null) {
      return res.json({
        statusCode: 400,
        error: 'userId not valid'
      })
    }

    try {
      const wasDeleted = await this.usersService.deleteUser(userId)
      if (wasDeleted !== true) {
        return res.json({
          statusCode: 500,
          message: `Error while removing user ${userId as string}`
        })
      }
    } catch (error) {
      console.error('ApiV1UserController - handleDeleteUser', error)
      return res.json({
        statusCode: 500,
        message: `err ${error.message as string}`
      })
    }

    return res.json({
      statusCode: 200,
      error: `User ${userId as string} removed`
    })
  }

  // @UseGuards(BearerTokenGuard)
  @Get(':userId/oauth_tokens')
  async getOauthTokens (@Request() req, @Res() res: Response, @Param('userId') userId: number): Promise<any> {
    if (userId == null) {
      return res.json({
        statusCode: 400,
        error: 'userId not valid'
      })
    }

    try {
      const userCredential = await this.userCredentialService.findUserCredentialByUserId(userId)

      if (userCredential === null) {
        return res.json({
          statusCode: 404,
          message: `Credentials not found for user ${userId}`
        })
      }

      let userTokens: any[] = []
      const providers = ['azure', 'google']
      userTokens = providers.reduce((userTokens, provider) => {
        const providerTokens = userCredential[provider]?.tokens ?? null
        if (providerTokens != null) {
          userTokens.push({
            email: userCredential.credential,
            provider,
            ...providerTokens
          })
        }
        return userTokens
      }, userTokens)

      return res.json({
        object: 'list',
        url: `/v1/user/${userId}/oauth_tokens`,
        has_more: false,
        data: userTokens
      })
    } catch (error) {
      console.error('ApiV1UserController - getOauthTokens', error)
      return res.json({
        statusCode: 500,
        message: `err ${error.message as string}`
      })
    }
  }
}
