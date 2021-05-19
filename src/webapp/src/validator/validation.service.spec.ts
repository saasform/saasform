import { Test, TestingModule } from '@nestjs/testing'
import { ValidationService } from './validation.service'

describe('ValditaionService', () => {
  let service
  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidationService
      ]
    }).compile()

    service = await module.get(ValidationService)

    // We must manually set the following because extending TypeOrmQueryService seems to break it
    // Object.keys(mockUserCredentialsEntity).forEach(f => (service[f] = mockUserCredentialsEntity[f]))
    // Object.keys(mockedRepo).forEach(f => (service[f] = mockedRepo[f]))
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('isNilOrEmpty', () => {
    it('with null', async () => {
      const isNil = await service.isNilOrEmpty(null)
      expect(isNil).toBeTruthy()
    })

    it('with undefined', async () => {
      const isNil = await service.isNilOrEmpty(undefined)
      expect(isNil).toBeTruthy()
    })

    it('with empty string', async () => {
      const isNil = await service.isNilOrEmpty('')
      expect(isNil).toBeTruthy()
    })

    it('with empty array', async () => {
      const isNil = await service.isNilOrEmpty([])
      expect(isNil).toBeTruthy()
    })
    it('with not empty string', async () => {
      const isNil = await service.isNilOrEmpty('something')
      expect(isNil).toBeFalsy()
    })
  })
})
