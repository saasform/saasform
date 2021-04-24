import { Controller, Get, UseGuards, Request, Res } from '@nestjs/common'
import { Response } from 'express'
import { AccountsService } from '../../../accounts/services/accounts.service'

import { UserRequiredAuthGuard } from '../../../auth/auth.guard'

@Controller('/api/v1/team')
export class ApiV1TeamController {
  constructor (
    private readonly accountsService: AccountsService
  ) {}

  @UseGuards(UserRequiredAuthGuard)
  @Get('users')
  async getUsers (@Request() req, @Res() res: Response): Promise<any> {
    const users = await this.accountsService.getUsers(req.user.account_id)

    if (users == null) {
      return res.status(400).json({
        statusCode: 400,
        error: 'Error while fetching users'
      })
    }

    const sanitizedUsers = users.map(u => {
      if (u != null) {
        const { id, email, data, created, isActive, username } = u
        return { id, email, profile: data.profile, emailConfirmed: data.emailConfirmed, created, isActive, username }
      }
    })

    return res.status(200).json({
      statusCode: 200,
      message: sanitizedUsers
    })
  }
}
