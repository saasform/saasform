import { Test, TestingModule } from '@nestjs/testing'
import { SettingsService, htmlEncode, mergeAll } from './settings.service'

import { SettingsEntity } from './settings.entity'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ConfigService } from '@nestjs/config'

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
  }
]

const mockRepository = {}

const mockQueryService = {
  query: jest.fn(q => (settingsData)),
  createOne: jest.fn(x => (x)),
  updateOne: jest.fn((id, x) => (x))
}

describe('SettingsService', () => {
  let service: SettingsService

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
          useValue: {
            get: jest.fn((key: string) => {
              switch (key) {
                default:
                  return null
              }
            })
          }
        }
      ]
    }).compile()

    service = module.get<SettingsService>(SettingsService)
    service.req = {}
    service.configService = module.get<ConfigService>(ConfigService)
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

    expect(mockQueryService.createOne).toHaveBeenCalledTimes(3)
    expect(mockQueryService.updateOne).toHaveBeenCalledTimes(1)
  })

  it('getUserSettings', async () => {
    const result = await service.getUserSettings()

    expect(mockQueryService.query).toHaveBeenCalled()
    expect(result.allowedKeys).toEqual(['key1', 'key2'])
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
    service.configService.get = jest.fn(key => 'saasform')
    service.query = jest.fn(q => ([{
      category: 'website',
      domain_app: 'myapp.mysite.com'
    }])) as any
    result = await service.getHomepageRedirectUrl()
    expect(result).toEqual(null)

    // redirect
    service.configService.get = jest.fn(key => 'redirect')
    service.query = jest.fn(q => ([{
      category: 'website',
      domain_app: 'myapp.mysite.com'
    }])) as any
    result = await service.getHomepageRedirectUrl()
    expect(result).toEqual('https://myapp.mysite.com')

    // db: redirect
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

  it('getRedirectAfterLogin', async () => {
    const mock = service.query
    let result

    // domain_app
    service.query = jest.fn(q => ([{
      category: 'website',
      domain_app: 'myapp.mysite.com'
    }])) as any
    result = await service.getRedirectAfterLogin()
    expect(result).toEqual('https://myapp.mysite.com')

    // domain_primary
    service.query = jest.fn(q => ([{
      category: 'website',
      domain_primary: 'mysite.com'
    }])) as any
    result = await service.getRedirectAfterLogin()
    expect(result).toEqual('https://app.mysite.com')

    // configured host
    service.query = mock
    service.configService.get = jest.fn(_ => 'mockedHost')
    result = await service.getRedirectAfterLogin()
    expect(result).toEqual('mockedHost')

    // no settings (original)
    service.query = mock
    service.configService.get = jest.fn(_ => '')
    result = await service.getRedirectAfterLogin()
    expect(result).toEqual('/')
  })

  it('getBaseUrl', async () => {
    // Default
    let result = await service.getBaseUrl()
    expect(result).toEqual('/')

    // Config wins on default
    service.configService.get = jest.fn(_ => 'mockedHost')
    result = await service.getBaseUrl()
    expect(result).toEqual('mockedHost')

    // DB wins on config
    service.query = jest.fn(q => ([{
      category: 'website',
      domain_primary: 'mysite.com'
    }])) as any

    result = await service.getBaseUrl()
    expect(result).toEqual('https://mysite.com')
  })

  it('getTopLevelUrl', async () => {
    // Default
    let result = await service.getTopLevelUrl()
    expect(result).toEqual('/')

    // Config wins on default
    service.configService.get = jest.fn(_ => 'mockedHost')
    result = await service.getTopLevelUrl()
    expect(result).toEqual('/')

    // Config wins on default
    service.configService.get = jest.fn(_ => 'localhost:7000')
    result = await service.getTopLevelUrl()
    expect(result).toEqual('/')

    // DB wins on config
    service.query = jest.fn(q => ([{
      category: 'website',
      domain_primary: 'mysite.com'
    }])) as any

    result = await service.getTopLevelUrl()
    expect(result).toEqual('https://mysite.com')

    // DB wins on config
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
