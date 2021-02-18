import { REQUEST } from '@nestjs/core'
import { Injectable, Scope, Inject } from '@nestjs/common'
import { QueryService } from '@nestjs-query/core'
import { getConnection } from 'typeorm'
import { BaseService } from '../../utilities/base.service'

// import { ProductEntity } from './product.entity';
// import { PriceEntity } from './price.entity';
import { PlanEntity } from '../entities/plan.entity'

import { Plan } from '../entities/plan.model'
import { PaymentEntity } from '../entities/payment.entity'
import { StripeService } from './stripe.service'

@QueryService(PlanEntity)
@Injectable({ scope: Scope.REQUEST })
export class PlansService extends BaseService<PlanEntity> {
  private readonly planRepository = getConnection().getRepository(PlanEntity)
  private readonly tenantId = 'default'

  constructor (
    @Inject(REQUEST) private readonly req,
    // @InjectRepository(PlanEntity)
    // private readonly productsRepository: Repository<PlanEntity>,
    private readonly stripeService: StripeService
  ) {
    super(
      req,
      'PlanEntity'
    )
    // this.tenantId = req.req ? req.req.tenantId : req.tenantId
  }

  createPlan (id, name, description, _prices, features, extra): any {
    if (features == null) { features = [] }

    const prices = _prices.reduce((prices, price) => {
      const { id, currency, unit_amount, unit_amount_decimal, recurring, product } = price // eslint-disable-line
      prices[recurring.interval] = {
        id,
        unit_amount_decimal,
        recurring,
        product,
        currency,
        unit_amount_hr: unit_amount / 100
      }

      return prices
    }, {})

    const plan = {
      id,
      description,
      name,
      features,
      ...extra,
      prices
    }

    return plan
  }

  async addPlan (name, description, monthAmount, yearAmount, features, extra): Promise<any> { // TODO: return a proper type
    try {
    // TODO: if yearAmount is 0, use standard discount
      const product = await this.stripeService.client.products.create({
        name,
        description
      })

      const monthPrice = await this.stripeService.client.prices.create({
        unit_amount: monthAmount,
        currency: 'usd',
        recurring: { interval: 'month' },
        product: product.id
      })

      const yearPrice = await this.stripeService.client.prices.create({
        unit_amount: yearAmount,
        currency: 'usd',
        recurring: { interval: 'year' },
        product: product.id
      })

      const _plan = this.createPlan(
        product.id, name, description,
        [monthPrice, yearPrice],
        features,
        extra
      )

      const plan = new PlanEntity()
      plan.product = JSON.stringify(product)
      plan.prices = JSON.stringify([monthPrice, yearPrice])
      plan.plan = JSON.stringify(_plan)

      await this.createOne(plan)
    } catch (err) {
      console.error('Error while creating plan', name, description, monthAmount, yearAmount, features, err)
      return null
    }
  }

  // TODO: Refactor
  async createFirstBilling (): Promise<any> { // TODO: return a proper type
    // should we move the API call outside?
    await this.addPlan(
      'Starter',
      'Starter plan',
      3500, 2900 * 12,
      [
        { name: '3 sites' },
        { name: '1,000 shares' },
        { name: 'Email support' }
      ],
      {
        button: 'Choose'
      }
    )

    await this.addPlan(
      'Pro',
      'Pro plan',
      11900, 9900 * 12,
      [
        { name: '100 sites' },
        { name: 'Unlimited shares' },
        { name: 'Premium support' }
      ],
      {
        button: 'Choose',
        primary: true
      }
    )

    await this.addPlan(
      'Enterprise',
      'Enterprise plan',
      0, 0,
      [
        { name: 'All features' },
        { name: 'Cloud or on-prem' },
        { name: 'Premium support' }
      ],
      {
        button: 'Contact us',
        priceText: 'Let\'s talk'
      }
    )
  }

  validatePlan (p): any {
    const plan = JSON.parse(p.plan)
    plan.prices.year.unit_amount_hr = Math.round(plan.prices.year.unit_amount_hr / 12)
    plan.uid = p.id // MySql ID used to update the plan
    return {
      ...plan,
      button: plan.button ?? 'Choose',
      price_year: plan.prices.year.unit_amount_hr,
      price_month: plan.prices.month.unit_amount_hr,
      price_decimals: plan.price_decimals ?? 0,
      price_text: plan.priceText,
      free_trial: plan.freeTrial
    }
  }

  async getPlans (): Promise<any[]> {
    let plans = await this.query({})

    if (plans.length === 0) {
      await this.createFirstBilling()
      plans = await this.query({})
    }

    return plans.map(this.validatePlan)
  }

  async getPricingAndPlans (): Promise<any> {
    const plans = await this.getPlans()
    return {
      free_trial: plans?.[0]?.free_trial ?? 0,
      plans
    }
  }

  async getPlanForPayment (payment: PaymentEntity): Promise<any> { // TODO: use a better type
    if (payment == null) { return null }

    const plans = await this.getPlans()
    const plan =
    payment && payment.data && payment.data.plan // eslint-disable-line
      ? plans.filter(p => p.id === payment.data.plan.product)[0]
      : null

    return plan
  }

  // This will update both the month and year prices for a plan
  /**
   * Updates a single plan. It requires both the month and year prices
   * If a price has changes, a new price is created on Stripe and updated
   * on the DB.
   * @param plan
   */
  async updatePlan (plan: Plan): Promise<PlanEntity | null> {
    // 1. get plan from DB
    const savedPlan = await this.findById(plan.uid)

    if (savedPlan == null) {
      console.error('plansService - updatePlan - savedPlan not found', plan)
      return null
    }

    // TODO: replace this with actual JSON values on the DB. See users and account for example
    let monthPrice = JSON.parse(savedPlan.prices)[0]
    let yearPrice = JSON.parse(savedPlan.prices)[1]

    let toUpdate = false

    // Create a new Stripe pricing for month price if necessary
    if (monthPrice.unit_amount_decimal !== plan.prices.month.unit_amount_decimal) {
      toUpdate = true
      monthPrice = await this.stripeService.client.prices.create({
        unit_amount: plan.prices.month.unit_amount_decimal,
        currency: 'usd',
        recurring: { interval: 'month' },
        product: plan.id
      })
    }
    // Create a new Stripe pricing for year price if necessary
    if (yearPrice.unit_amount_decimal !== plan.prices.year.unit_amount_decimal) {
      toUpdate = true
      yearPrice = await this.stripeService.client.prices.create({
        unit_amount: plan.prices.year.unit_amount_decimal,
        currency: 'usd',
        recurring: { interval: 'year' },
        product: plan.id
      })
    }

    const FIELDS = ['name', 'limitUsers', 'freeTrial', 'priceText']
    const savedPlanData = JSON.parse(savedPlan.plan)
    for (const key of FIELDS) {
      if (plan[key] !== savedPlanData[key]) {
        toUpdate = true
      }
    }

    // Update plan on the DB, if necessary
    if (toUpdate) {
      // TODO: replace this with actual JSON values on the DB. See users and account for example
      const { id, name, description, features, ...extra } = savedPlanData
      const newExtra = {
        ...extra,
        limitUsers: plan.limitUsers,
        freeTrial: plan.freeTrial,
        priceText: plan.priceText
      }

      const _plan = this.createPlan(
        id, plan.name, description,
        [monthPrice, yearPrice],
        plan?.features ?? [],
        newExtra
      )

      // TODO: replace this with actual JSON values on the DB. See users and account for example
      savedPlan.prices = JSON.stringify([monthPrice, yearPrice])
      savedPlan.plan = JSON.stringify(_plan)

      const { id: plan_id, ...update } = savedPlan // eslint-disable-line
      await this.updateOne(plan.uid, update)
    }

    const ret = await this.findById(plan.uid)

    if (ret == null) {
      console.error('plansService - error')
      return null
    }

    return ret
  }

  /**
   * Get a price given a plan and the indication if it is annual or monthly payment
   *
   * @param product
   * @param annual
   */
  async getPriceByProductAndAnnual (product: any, monthly: any): Promise<any> {
    const plans = await this.getPlans()

    const res = plans.filter(p => p.id === product)[0]

    return monthly != null ? res.prices.month : res.prices.year
  }
}
