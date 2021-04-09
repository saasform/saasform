import { Test, TestingModule } from '@nestjs/testing'
import { NotificationsService } from './notifications.service'
import { mockedSettingRepo } from '../accounts/test/testData'
import { SettingsService } from '../settings/settings.service'
import { ConfigService } from '@nestjs/config'

import * as sgMail from '@sendgrid/mail'

const mockedConfig = {
  get: jest.fn(key => {
    return {
      SENDGRID_API_KEY: 'SG.1',
      SENDGRID_SEND_FROM: 'hello@saasform.dev'
    }[key]
  })
}

// const sgMail = {
//   setApiKey: jest.fn(_ => {}),
//   send: jest.fn(_ => {}),
// }

describe('NotificationsService', () => {
  let service: any
  let sgMailSetApiKeyMock: any
  let sgMailSendMockThrowError = false
  let sgMailSendMock: any

  beforeEach(async () => {
    jest.clearAllMocks()
    sgMailSetApiKeyMock = jest.spyOn(sgMail, 'setApiKey').mockImplementationOnce(() => {})
    sgMailSendMock = jest.spyOn(sgMail, 'send').mockImplementationOnce(async () => {
      if (sgMailSendMockThrowError) {
        throw new Error('Mocked error with Sendgrid')
      }
      // console.log(msg)
      return [{} as any, {}]
    })

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: SettingsService, useValue: mockedSettingRepo },
        { provide: ConfigService, useValue: mockedConfig }
      ]
    }).compile()

    service = await module.get<NotificationsService>(NotificationsService)
    service.settingsService = mockedSettingRepo
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
    expect(sgMailSetApiKeyMock).toHaveBeenCalledTimes(1)
  })

  describe('isCertainlyInvalidApiKey', () => {
    it('should be invalid when empty', async () => {
      const reMockedConfig = {
        get: jest.fn(key => {
          return {
            SENDGRID_API_KEY: '',
            SENDGRID_SEND_FROM: 'hello@saasform.dev'
          }[key]
        })
      }

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          NotificationsService,
          { provide: SettingsService, useValue: mockedSettingRepo },
          { provide: ConfigService, useValue: reMockedConfig }
        ]
      }).compile()

      service = await module.get<NotificationsService>(NotificationsService)
      expect(service.isCertainlyInvalidApiKey()).toBe(true)
    })

    it('should be invalid when ending with xxx', async () => {
      const reMockedConfig = {
        get: jest.fn(key => {
          return {
            SENDGRID_API_KEY: 'SG.xxx',
            SENDGRID_SEND_FROM: 'hello@saasform.dev'
          }[key]
        })
      }

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          NotificationsService,
          { provide: SettingsService, useValue: mockedSettingRepo },
          { provide: ConfigService, useValue: reMockedConfig }
        ]
      }).compile()

      service = await module.get<NotificationsService>(NotificationsService)
      expect(service.isCertainlyInvalidApiKey()).toBe(true)
    })

    it('should be valid otherwise', async () => {
      expect(service.isCertainlyInvalidApiKey()).toBe(false)
    })
  })

  // describe('render', () => {
  //   it('should ...', async () => {
  //     ...
  //   })
  // })

  describe('sendEmail', () => {
    it('should send when everything is good', async () => {
      const res = await service.sendEmail('user@saasform.dev', 'email_confirm', {})
      expect(res).toBe(true)
      expect(sgMailSendMock).toHaveBeenCalledTimes(1)
    })

    it('should NOT send when API key is not configured', async () => {
      service.isCertainlyInvalidApiKey = jest.fn(() => true)

      const res = await service.sendEmail('user@saasform.dev', 'email_confirm', {})
      expect(res).toBe(false)
      expect(sgMailSendMock).toHaveBeenCalledTimes(0)
    })

    it('should NOT send when `to` is empty', async () => {
      const res = await service.sendEmail('', 'email_confirm', {})
      expect(res).toBe(false)
      expect(sgMailSendMock).toHaveBeenCalledTimes(0)
    })

    it('should NOT send when `template` is empty', async () => {
      const res = await service.sendEmail('user@saasform.dev', '', {})
      expect(res).toBe(false)
      expect(sgMailSendMock).toHaveBeenCalledTimes(0)
    })

    it('should NOT send when `template` is invalid', async () => {
      const res = await service.sendEmail('user@saasform.dev', 'invalid', {})
      expect(res).toBe(false)
      expect(sgMailSendMock).toHaveBeenCalledTimes(0)
    })

    it('should NOT send when Sendgrid throws an exception', async () => {
      sgMailSendMockThrowError = true
      const res = await service.sendEmail('user@saasform.dev', 'email_confirm', {})
      expect(res).toBe(true)
      expect(sgMailSendMock).toHaveBeenCalledTimes(1)
    })
  })
})
