import { Test, TestingModule } from '@nestjs/testing'
import { CronService } from './cron.service'
import { ConfigService } from '@nestjs/config'
import { SchedulerRegistry } from '@nestjs/schedule'

import { SettingsService } from '../settings/settings.service'
import { AccountsService } from '../accounts/services/accounts.service'
import { PaymentsService } from '../payments/services/payments.service'
import { NotificationsService } from '../notifications/notifications.service'

describe('CronService', () => {
  let service
  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CronService,
        {
          provide: ConfigService,
          useValue: {}
        },
        { provide: PaymentsService, useValue: {} },
        { provide: SettingsService, useValue: {} },
        { provide: AccountsService, useValue: {} },
        { provide: NotificationsService, useValue: {} },
        { provide: SchedulerRegistry, useValue: {} }
      ]
    }).compile()

    service = await module.get(CronService)

    // We must manually set the following because extending TypeOrmQueryService seems to break it
    // Object.keys(mockUserCredentialsEntity).forEach(f => (service[f] = mockUserCredentialsEntity[f]))
    // Object.keys(mockedRepo).forEach(f => (service[f] = mockedRepo[f]))
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
