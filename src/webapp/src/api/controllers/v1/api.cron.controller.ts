import { Controller, Get, Request, Res } from '@nestjs/common'
import { Response } from 'express'
import { CronService } from '../../../cron/cron.service'

@Controller('/api/v1/cron')
export class ApiV1CronController {
  constructor (
    private readonly cronService: CronService
  ) {}

  @Get('register')
  async handleAddPaymentToken (@Request() req, @Res() res: Response): Promise<any> {
    await this.cronService.setupCron()

    return res.json({
      statusCode: 200,
      message: 'Cron service registered'
    })
  }
}
