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
import { KillBillService } from './killbill.service'
import { SimplePlan, SimplePlanCurrencyEnum, SimplePlanBillingPeriodEnum, SimplePlanProductCategoryEnum } from 'killbill'
import { ConfigService } from '@nestjs/config'
import { SettingsService } from '../../settings/settings.service'

@QueryService(PlanEntity)
@Injectable({ scope: Scope.REQUEST })
export class PlansService extends BaseService<PlanEntity> {
  private readonly planRepository = getConnection().getRepository(PlanEntity)
  private readonly paymentIntegration: string

  constructor (
    @Inject(REQUEST) private readonly req,
    private readonly configService: ConfigService,
    private readonly settingsService: SettingsService,
    private readonly stripeService: StripeService,
    private readonly killBillService: KillBillService
  ) {
    super(
      req,
      'PlanEntity'
    )
    this.paymentIntegration = this.configService.get<string>('MODULE_PAYMENT', 'stripe')
  }

  /**
   * Return a plan object from a string handle
   * @param handle the handle to the plan. It is in the format 'm-plus' there m stands from monthly or yearly and plus is the immutable name of the plan within Saasform
   */
  async getPlanFromHandle (handle: string): Promise<any> { // TODO: make and entity
    // Inkstinct
    // return {
    //   freeTrial: 0, // if 0, no trial, if > 0 days of trial
    //   price: 4900, //  if 0, free tier, if > 0 price
    //   interval: 'month', // month or year
    //   ref: 'pro', // internal plan name, immutable
    //   provider: 'stripe', // stripe/killbill (free tier, trial, full), external (enterprise)
    //   stripe: { prices: { month: { id: 'price_1JHr1gBZGgCe7OWGGed4jbe7' } } }
    // }

    // Free trial
    // return {
    //   freeTrial: 4, // if 0, no trial, if > 0 days of trial
    //   price: 4900, //  if 0, free tier, if > 0 price
    //   interval: 'month', // month or year
    //   ref: 'pro', // internal plan name, immutable
    //   provider: 'stripe', // stripe/killbill (free tier, trial, full), external (enterprise)
    //   stripe: { prices: { month: { id: 'price_1JHr1gBZGgCe7OWGGed4jbe7' } } }
    // }

    // Enterprise
    // return {
    //   freeTrial: 0, // if 0, no trial, if > 0 days of trial
    //   price: 0, //  if 0, free tier, if > 0 price
    //   interval: 'month', // month or year
    //   ref: 'pro', // internal plan name, immutable
    //   provider: 'external' // stripe/killbill (free tier, trial, full), external (enterprise)
    // }

    // Free tier
    return {
      freeTrial: 0, // if 0, no trial, if > 0 days of trial
      price: 0, //  if 0, free tier, if > 0 price
      interval: 'month', // month or year
      ref: 'pro', // internal plan name, immutable
      provider: 'stripe' // stripe/killbill (free tier, trial, full), external (enterprise)
    }

    // Free tier with trial
    // return {
    //   freeTrial: 4, // if 0, no trial, if > 0 days of trial
    //   price: 0, //  if 0, free tier, if > 0 price
    //   interval: 'month', // month or year
    //   ref: 'pro', // internal plan name, immutable
    //   provider: 'stripe', // stripe/killbill (free tier, trial, full), external (enterprise)
    //   stripe: { prices: { month: { id: 'price_1JHr1gBZGgCe7OWGGed4jbe7' } } }
    // }
  }

  // OLD

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
    if (this.paymentIntegration === 'killbill') {
      await this.addKillBillPlan(name, description, monthAmount, yearAmount, features, extra)
    } else {
      await this.addStripePlan(name, description, monthAmount, yearAmount, features, extra)
    }
  }

  async addKillBillPlan (name, description, monthAmount, yearAmount, features, extra): Promise<any> {
    try {
      let planData: SimplePlan
      planData = {
        planId: `${String(name)}-monthly`,
        productName: name,
        productCategory: SimplePlanProductCategoryEnum.BASE,
        currency: SimplePlanCurrencyEnum.USD,
        amount: monthAmount,
        billingPeriod: SimplePlanBillingPeriodEnum.MONTHLY,
        trialLength: 0
      }
      await this.killBillService.catalogApi.addSimplePlan(planData, 'saasform')

      planData = {
        planId: `${String(name)}-yearly`,
        productName: name,
        productCategory: SimplePlanProductCategoryEnum.BASE,
        currency: SimplePlanCurrencyEnum.USD,
        amount: yearAmount,
        billingPeriod: SimplePlanBillingPeriodEnum.ANNUAL,
        trialLength: 0
      }
      await this.killBillService.catalogApi.addSimplePlan(planData, 'saasform')

      // For now, make it look like a Stripe plan (the Kill Bill data model is quite different though)
      const product = { id: name, description: description, killbill: true }
      const monthPrice = { type: 'recurring', unit_amount: monthAmount, recurring: { interval: 'month', interval_count: 1 }, killbill: true }
      const yearPrice = { type: 'recurring', unit_amount: monthAmount, recurring: { interval: 'year', interval_count: 1 }, killbill: true }
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

  async addStripePlan (name, description, monthAmount, yearAmount, features, extra): Promise<any> {
    try {
    // TODO: if yearAmount is 0, use standard discount
      const product = await this.stripeService.client.products.create({
        name,
        description
      }, this.stripeService.apiOptions)

      const monthPrice = await this.stripeService.client.prices.create({
        unit_amount: monthAmount,
        currency: 'usd',
        recurring: { interval: 'month' },
        product: product.id
      }, this.stripeService.apiOptions)

      const yearPrice = await this.stripeService.client.prices.create({
        unit_amount: yearAmount,
        currency: 'usd',
        recurring: { interval: 'year' },
        product: product.id
      }, this.stripeService.apiOptions)

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
      // console.error('Error while creating plan', name, description, monthAmount, yearAmount, features, err)
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
    plan.prices.year.unit_amount_hr = (plan.price_decimals > 0) ? plan.prices.year.unit_amount_hr / 12 : Math.round(plan.prices.year.unit_amount_hr / 12)
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

    const stripePlans: PlanEntity[] = []
    const killbillPlans: PlanEntity[] = []
    for (var plan of plans) {
      if (JSON.parse(plan.product).killbill === true) {
        killbillPlans.push(plan)
      } else {
        stripePlans.push(plan)
      }
    }

    const createPlan = (this.paymentIntegration === 'killbill' && killbillPlans.length === 0) || (this.paymentIntegration === 'stripe' && stripePlans.length === 0)
    if (createPlan) {
      await this.createFirstBilling()
      plans = await this.query({})
      // TODO - keep plans in sync with config
      if (plans.length === 0) {
        const settings = await this.settingsService.getWebsiteRenderingVariables()
        plans = settings.pricing_plans
        return plans.map((p, j) => ({ ...p, id: j }))
      }
      return plans.map(this.validatePlan)
    } else {
      return (this.paymentIntegration === 'killbill' ? killbillPlans : stripePlans).map(this.validatePlan)
    }
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
      }, this.stripeService.apiOptions)
    }
    // Create a new Stripe pricing for year price if necessary
    if (yearPrice.unit_amount_decimal !== plan.prices.year.unit_amount_decimal) {
      toUpdate = true
      yearPrice = await this.stripeService.client.prices.create({
        unit_amount: plan.prices.year.unit_amount_decimal,
        currency: 'usd',
        recurring: { interval: 'year' },
        product: plan.id
      }, this.stripeService.apiOptions)
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
