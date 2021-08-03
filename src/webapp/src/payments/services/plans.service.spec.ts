import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
// import { Repository } from 'typeorm'
import { TypeOrmQueryService } from '@nestjs-query/query-typeorm'

import { PlanEntity } from '../entities/plan.entity'
import { PlansService } from './plans.service'
import { StripeService } from './stripe.service'
import { KillBillService } from './killbill.service'
import { SettingsService } from '../../settings/settings.service'
import { ConfigService } from '@nestjs/config'
import { ProvidersService } from './providers.service'

const mockedRepo = {
  find: jest.fn().mockResolvedValue([]),
  createOne: jest.fn(record => record)
}

describe('PlansService', () => {
  let service
  // let repo: Repository<PlanEntity>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlansService,
        {
          provide: getRepositoryToken(PlanEntity),
          useValue: mockedRepo
        },
        {
          provide: SettingsService,
          useValue: {}
        },
        {
          provide: StripeService,
          useValue: {}
        },
        {
          provide: KillBillService,
          useValue: {}
        },
        {
          provide: ConfigService,
          useValue: {}
        },
        ProvidersService,
        // TODO: Also stripe goes here
        // We must also pass TypeOrmQueryService
        TypeOrmQueryService
      ]
    }).compile()

    service = module.get<PlansService>(PlansService)
    // repo = await module.get<Repository<PlanEntity>>(
    //   getRepositoryToken(PlanEntity)
    // )

    Object.keys(mockedRepo).forEach(f => (service[f] = mockedRepo[f]))
    // service.accountsRepository = repo;
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('Update of a plan', () => {
    it('should change nothing if no plan is changed', () => {

    })

    it('should create a new stripe pricing if plan is changed', () => {

    })

    it('should be capable of updating more than on plan at the same time', () => {

    })
  })

  describe('Add a plan', () => {
    it('should create 2 pricings on stripe', () => {

    })

    it('should add a plan', () => {

    })
  })

  describe('Create a plan', () => {
    it('should create a plan from two prices', () => {
      // TODO: call with given value, check retun. No fixture nor mocks needed
    })
  })

  describe('Get plans', () => {
    it('should return the list of plans', () => {

    })

    it('should create default plans if no plan is present', () => {

    })
  })
})
