import { Controller, Get, Request } from '@nestjs/common'
import { ApiExcludeEndpoint } from '@nestjs/swagger'
import { CronService } from '../../../cron/cron.service'

@Controller('/api/v1/cron')
export class ApiV1CronController {
  constructor (
    private readonly cronService: CronService
  ) {}

  @ApiExcludeEndpoint()
  @Get('register')
  async handleAddPaymentToken (@Request() req): Promise<any> {
    await this.cronService.setupCron()

    return {
      statusCode: 200,
      message: 'Cron service registered'
    }
  }
}
