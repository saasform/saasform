import { Test, TestingModule } from '@nestjs/testing'
import { SettingsService, htmlEncode, mergeAll } from './settings.service'

import { SettingsEntity } from './settings.entity'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ConfigService } from '@nestjs/config'
import { ValidationService } from '../validator/validation.service'

const settingsData = [
  {
    category: 'website',
    name: 'My SaaS',
    domain_primary: null,
    logos: ['facebook', 'pinterest']
  },
  {
    category: 'keys'
  },
  {
    category: 'user',
    allowedKeys: ['key1', 'key2']
  },
  {
    category: 'admin',
    trial_expiring_cron: '1 2 3 * * *'
  }
]

const mockRepository = {}

const mockQueryService = {
  query: jest.fn(q => (settingsData)),
  createOne: jest.fn(x => (x)),
  updateOne: jest.fn((id, x) => (x))
}

const mockConfigService = {
  get: jest.fn((key: string) => {
    switch (key) {
      default:
        return null
    }
  })
}

describe('SettingsService', () => {
  let service

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        {
          provide: getRepositoryToken(SettingsEntity),
          useValue: mockRepository
        },
        {
          provide: ConfigService,
          useValue: mockConfigService
        },
        { provide: ValidationService, useValue: { isNilOrEmpty: jest.fn().mockReturnValue(false) } }
      ]
    }).compile()

    service = module.get<SettingsService>(SettingsService)
    service.req = {}
    service.configService = mockConfigService
    Object.keys(mockQueryService).forEach(f => (service[f] = mockQueryService[f]))
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('validateSettings should create empty values', async () => {
    const data: any = {}
    await service.validateSettings(data)

    expect(data.website).toBeDefined()
    expect(data.keys).toBeDefined()
    expect(data.keys.jwt_private_key).toBeDefined()

    expect(mockQueryService.createOne).toHaveBeenCalledTimes(4)
    expect(mockQueryService.updateOne).toHaveBeenCalledTimes(1)
  })

  it('getUserSettings', async () => {
    const result = await service.getUserSettings()

    expect(mockQueryService.query).toHaveBeenCalled()
    expect(result.allowedKeys).toEqual(['key1', 'key2'])
  })

  it('getAdminSettings', async () => {
    service.validationService = { isNilOrEmpty: jest.fn().mockReturnValue(false) }

    const result = await service.getAdminSettings()

    expect(mockQueryService.query).toHaveBeenCalled()
    expect(result).toEqual({
      category: 'admin',
      trial_expiring_cron: '1 2 3 * * *'
    })
  })

  it('getWebsiteRenderingVariables (TODO)', async () => {
    const result = await service.getWebsiteRenderingVariables()

    expect(mockQueryService.query).toHaveBeenCalled()
    expect(result.name).toEqual('My SaaS')
  })

  it('getJWTPublicKey', async () => {
    const expected = '-----BEGIN PUBLIC KEY-----'
    const result = await service.getJWTPublicKey()
    // expect(result).toStartWith(expected);
    expect(result.substr(0, expected.length)).toEqual(expected)
  })

  it('getJWTPrivateKey', async () => {
    const expected = '-----BEGIN PRIVATE KEY-----'
    const result = await service.getJWTPrivateKey()
    // expect(result).toStartWith(expected);
    expect(result.substr(0, expected.length)).toEqual(expected)
  })

  it('getHomepageRedirectUrl', async () => {
    let result

    // saasform
    service.data = null // disable cache
    service.configService.get = jest.fn(key => 'saasform')
    service.query = jest.fn(q => ([{
      category: 'website',
      domain_app: 'myapp.mysite.com'
    }])) as any
    result = await service.getHomepageRedirectUrl()
    expect(result).toEqual(null)

    // redirect
    service.data = null // disable cache
    service.configService.get = jest.fn(key => 'redirect')
    service.query = jest.fn(q => ([{
      category: 'website',
      domain_app: 'myapp.mysite.com'
    }])) as any
    result = await service.getHomepageRedirectUrl()
    expect(result).toEqual('https://myapp.mysite.com')

    // db: redirect
    service.data = null // disable cache
    service.configService.get = jest.fn(key => 'saasform')
    service.query = jest.fn(q => ([{
      category: 'website',
      domain_app: 'myapp.mysite.com'
    }, {
      category: 'modules',
      homepage: 'redirect'
    }])) as any
    result = await service.getHomepageRedirectUrl()
    expect(result).toEqual('https://myapp.mysite.com')

    // db: invalid
    service.data = null // disable cache
    service.configService.get = jest.fn(key => 'redirect')
    service.query = jest.fn(q => ([{
      category: 'website',
      domain_app: 'myapp.mysite.com'
    }, {
      category: 'modules',
      homepage: 'not redirect'
    }])) as any
    result = await service.getHomepageRedirectUrl()
    expect(result).toEqual(null)
  })

  it('getConfiguredRedirectAfterLogin', async () => {
    const mock = service.query
    let result

    // domain_app
    service.query = jest.fn(q => ([{
      category: 'website',
      domain_app: 'myapp.mysite.com'
    }])) as any
    result = await service.getConfiguredRedirectAfterLogin()
    expect(result).toEqual('https://myapp.mysite.com')

    // domain_primary
    service.data = null // disable cache
    service.query = jest.fn(q => ([{
      category: 'website',
      domain_primary: 'mysite.com'
    }])) as any
    result = await service.getConfiguredRedirectAfterLogin()
    expect(result).toEqual('https://app.mysite.com')

    // configured host
    service.data = null // disable cache
    service.query = mock
    service.configService.get = jest.fn(_ => 'mockedHost')
    result = await service.getConfiguredRedirectAfterLogin()
    expect(result).toEqual('mockedHost')

    // no settings (original)
    service.data = null // disable cache
    service.query = mock
    service.configService.get = jest.fn(_ => '')
    result = await service.getConfiguredRedirectAfterLogin()
    expect(result).toEqual('/')
  })

  it('getBaseUrl', async () => {
    // Default
    let result = await service.getBaseUrl()
    expect(result).toEqual('/')

    // Config wins on default
    service.data = null // disable cache
    service.configService.get = jest.fn(_ => 'mockedHost')
    result = await service.getBaseUrl()
    expect(result).toEqual('mockedHost')

    // DB wins on config
    service.data = null // disable cache
    service.query = jest.fn(q => ([{
      category: 'website',
      domain_primary: 'mysite.com'
    }])) as any

    service.data = null // disable cache
    result = await service.getBaseUrl()
    expect(result).toEqual('https://mysite.com')
  })

  it('getTopLevelUrl', async () => {
    // Default
    let result = await service.getTopLevelUrl()
    expect(result).toEqual('/')

    // Config wins on default
    service.data = null // disable cache
    service.configService.get = jest.fn(_ => 'mockedHost')
    result = await service.getTopLevelUrl()
    expect(result).toEqual('/')

    // Config wins on default
    service.data = null // disable cache
    service.configService.get = jest.fn(_ => 'localhost:7000')
    result = await service.getTopLevelUrl()
    expect(result).toEqual('/')

    // DB wins on config
    service.data = null // disable cache
    service.query = jest.fn(q => ([{
      category: 'website',
      domain_primary: 'mysite.com'
    }])) as any

    result = await service.getTopLevelUrl()
    expect(result).toEqual('https://mysite.com')

    // DB wins on config
    service.data = null // disable cache
    service.query = jest.fn(q => ([{
      category: 'website',
      domain_primary: 'account.mysite.com'
    }])) as any

    result = await service.getTopLevelUrl()
    expect(result).toEqual('https://mysite.com')
  })
})

describe('SettingsService (aux functions)', () => {
  it('htmlEncode', () => {
    // expect(htmlEncode(undefined)).toEqual('') // can't assign undefined to string
    // expect(htmlEncode(null)).toEqual('') // can't assign null to string
    expect(htmlEncode('')).toEqual('')

    expect(htmlEncode('hello world')).toEqual('hello world')
    expect(htmlEncode('hello <world>')).toEqual('hello &lt;world&gt;')
    expect(htmlEncode('hello &lt;world&gt;')).toEqual('hello &lt;world&gt;')
  })

  it('mergeAll', () => {
    const entity = new SettingsEntity() as any
    entity.category = 'before'
    entity.nonExisting = 'before'
    entity.toDelete = 'before'

    const update = {
      category: 'after',
      nonExisting: 'after',
      newField: 'after',
      toDelete: null
    }

    const result = mergeAll(entity, update) as any
    expect(result.category).toEqual('after')
    expect(result.nonExisting).toEqual('after')
    expect(result.newField).toEqual('after')
    expect(result.toDelete).toBeUndefined()
  })
})
