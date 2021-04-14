import { Controller, Post, UseGuards, Request, Res } from '@nestjs/common'
import { Response } from 'express'
import { AccountsService } from '../../../accounts/services/accounts.service'

import { UserRequiredAuthGuard } from '../../../auth/auth.guard'

@Controller('/api/v1/account')
export class ApiV1AccountController {
  constructor (
    private readonly accountsService: AccountsService
  ) {}

  @UseGuards(UserRequiredAuthGuard)
  @Post('link-domain')
  async handleLinkDomain (@Request() req, @Res() res: Response): Promise<any> {
    // Searching by the owner email ensures that only the owner can link a domain
    // If we allow other ones to link the domain, we need to change this
    const account = await this.accountsService.findByOwnerEmail(req.user.email)

    if (account == null) {
      return res.status(400).json({
        statusCode: 400,
        error: 'Account not found'
      })
    }

    const { domain } = req.body

    if (domain == null || domain === '') {
      return res.status(400).json({
        statusCode: 400,
        error: 'Domain not correct'
      })
    }

    const linked = await this.accountsService.linkDomain(account.id, domain)
    if (linked == null) {
      console.error('ApiV1AccountController - handleLinkDomain, error while linking')
      return res.status(500).json({
        statusCode: 500,
        error: 'Error while linking'
      })
    }

    return res.status(200).json({
      statusCode: 200,
      message: 'Linked'
    })
  }
}
