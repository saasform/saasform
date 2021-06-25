import { Controller, Get, Post, UseGuards, Request, Res } from '@nestjs/common'
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger'
import { Response } from 'express'
import { AccountsService } from '../../../accounts/services/accounts.service'

import { UserRequiredAuthGuard } from '../../../auth/auth.guard'

@ApiBearerAuth()
@ApiCookieAuth()
@ApiTags('Settings page')
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

  @UseGuards(UserRequiredAuthGuard)
  @Post('user')
  async inviteUser (@Request() req, @Res() res: Response): Promise<any> {
    // Searching by the owner email ensures that only the owner can link a domain
    // If we allow other ones to link the domain, we need to change this
    const account = await this.accountsService.findByOwnerEmail(req.user.email)

    if (account == null) {
      return res.status(400).json({
        statusCode: 400,
        error: 'Account not found'
      })
    }

    const { name, email } = req.body

    const user = await this.accountsService.inviteUser({ name, email }, account.id)

    if (user == null) {
      return res.status(400).json({
        statusCode: 400,
        error: 'Error while inviting user'
      })
    }

    return res.status(200).json({
      statusCode: 200,
      message: 'User invited'
    })
  }
}
