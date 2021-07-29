import { Controller, Post, UseGuards, Request } from '@nestjs/common'
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger'
import { AccountsService } from '../../../accounts/services/accounts.service'

import { UserRequiredAuthGuard } from '../../../auth/auth.guard'

@ApiBearerAuth()
@ApiCookieAuth()
@ApiTags('Settings page')
@Controller('/api/v1/account')
export class ApiV1AccountController {
  constructor (
    private readonly accountsService: AccountsService
  ) {}

  @UseGuards(UserRequiredAuthGuard)
  @Post('link-domain')
  async handleLinkDomain (@Request() req): Promise<any> {
    // Searching by the owner email ensures that only the owner can link a domain
    // If we allow other ones to link the domain, we need to change this
    const account = await this.accountsService.findByOwnerEmail(req.user.email)

    if (account == null) {
      return {
        statusCode: 400,
        error: 'Account not found'
      }
    }

    const { domain } = req.body

    if (domain == null || domain === '') {
      return {
        statusCode: 400,
        error: 'Domain not correct'
      }
    }

    const linked = await this.accountsService.linkDomain(account.id, domain)
    if (linked == null) {
      console.error('ApiV1AccountController - handleLinkDomain, error while linking')
      return {
        statusCode: 400,
        error: 'Error while linking'
      }
    }

    req.userUpdated = true
    return {
      statusCode: 200,
      message: 'Linked'
    }
  }
}
