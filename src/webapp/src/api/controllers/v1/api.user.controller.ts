import { Controller, Get, Post, Put, Delete, UseGuards, Request, Param } from '@nestjs/common'
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger'
import { SettingsService } from '../../../settings/settings.service'
import { AccountsService } from '../../../accounts/services/accounts.service'
import { PlansService } from '../../../payments/services/plans.service'
import { UsersService } from '../../../accounts/services/users.service'

import { UserRequiredAuthGuard, BearerTokenGuard } from '../../../auth/auth.guard'
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
  async handlePasswordChange (@Request() req): Promise<any> {
    const { password } = req.body
    const passwordConfirmation = req.body['password-confirm']
    const passwordNew = req.body['password-new']

    if (password == null) {
      return {
        statusCode: 400,
        error: 'Password not valid'
      }
    }
    if (passwordNew !== passwordConfirmation) {
      return {
        statusCode: 400,
        error: 'Confirmation password doesn\'t match'
      }
    }

    let result: Boolean

    try {
      result = await this.usersService.changePassword(req.user.email, password, passwordNew)
    } catch (error) {
      console.error('ApiV1UserController - handlePasswordChange', error)
      return {
        statusCode: 500,
        message: `err ${error.message as string}`
      }
    }

    if (result !== true) {
      return {
        statusCode: 400,
        error: 'Error while changing password'
      }
    }

    req.userUpdated = true
    return {
      statusCode: 200,
      message: 'Password changed'
    }
  }

  @UseGuards(UserRequiredAuthGuard)
  @Put(':userId')
  async updateUserProfile (@Request() req, @Param('userId') userId): Promise<any> {
    const updatedUser = await this.usersService.updateUserProfile(req.body, userId)

    if (updatedUser == null) {
      console.error('UserController - updateUserProfile - User not updated', req.user.account_id)
      return {
        statusCode: 500,
        error: 'User not updated'
      }
    }

    const { company } = req.body
    if (company != null && company !== '') {
      const account = await this.accountsService.findById(req.user.account_id)

      if (account == null) {
        console.error('UserController - updateUserProfile - Account not found', req.user.account_id)
        return {
          statusCode: 400,
          error: 'Account not found'
        }
      }

      const updatedAccount = await this.accountsService.setCompanyName(account, company)

      if (updatedAccount == null) {
        console.error('UserController - updateUserProfile - Account not updated', req.user.account_id)
        return {
          statusCode: 500,
          error: 'Account not updated'
        }
      }
    }

    req.userUpdated = true
    return {
      statusCode: 200,
      message: 'Profile updated'
    }
  }

  @UseGuards(UserRequiredAuthGuard)
  @Delete(':userId')
  async handleDeleteUser (@Request() req, @Param('userId') userId): Promise<any> {
    if (userId == null) {
      return {
        statusCode: 400,
        error: 'userId not valid'
      }
    }

    try {
      const wasDeleted = await this.usersService.deleteUser(userId)
      if (wasDeleted !== true) {
        return {
          statusCode: 500,
          message: `Error while removing user ${userId as string}`
        }
      }
    } catch (error) {
      console.error('ApiV1UserController - handleDeleteUser', error)
      return {
        statusCode: 500,
        message: `err ${error.message as string}`
      }
    }

    // req.userUpdated = true
    return {
      statusCode: 200,
      error: `User ${userId as string} removed`
    }
  }

  @UseGuards(BearerTokenGuard)
  @Get(':userId')
  async getProfile (@Request() req, @Param('userId') userId: number): Promise<any> {
    if (userId == null) {
      return {
        statusCode: 400,
        error: 'userId not valid'
      }
    }

    try {
      const user = await this.usersService.findById(userId)

      const profile = user?.getProfile() ?? {}

      return {
        object: 'user',
        url: `/v1/user/${userId}`,
        has_more: false,
        data: profile
      }
    } catch (err) {

    }
  }

  @UseGuards(BearerTokenGuard)
  @Get(':userId/oauth_tokens')
  async getOauthTokens (@Request() req, @Param('userId') userId: number): Promise<any> {
    if (userId == null) {
      return {
        statusCode: 400,
        error: 'userId not valid'
      }
    }

    try {
      const userCredential = await this.userCredentialService.findUserCredentialByUserId(userId)

      if (userCredential === null) {
        return {
          statusCode: 404,
          message: `Credentials not found for user ${userId}`
        }
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

      return {
        object: 'list',
        url: `/v1/user/${userId}/oauth_tokens`,
        has_more: false,
        data: userTokens
      }
    } catch (error) {
      console.error('ApiV1UserController - getOauthTokens', error)
      return {
        statusCode: 500,
        message: `err ${error.message as string}`
      }
    }
  }
}
