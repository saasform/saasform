import { Controller, Post, Delete, UseGuards, Request, Res, Param } from '@nestjs/common'
import { Response } from 'express'
import { SettingsService } from '../../../settings/settings.service'
import { AccountsService } from '../../../accounts/services/accounts.service'
import { PlansService } from '../../../payments/services/plans.service'
import { UsersService } from '../../../accounts/services/users.service'

import { UserRequiredAuthGuard } from '../../../auth/auth.guard'

@Controller('/api/v1/user')
export class ApiV1UserController {
  constructor (
    private readonly usersService: UsersService,
    private readonly settingsService: SettingsService,
    private readonly accountsService: AccountsService,
    private readonly plansService: PlansService
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
}
