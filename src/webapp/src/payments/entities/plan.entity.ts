import { Entity, Column, PrimaryGeneratedColumn, AfterLoad } from 'typeorm'

/*
  // JSON DB object
  {
    "ref": "pro",
    "name": "Pro",
    "price_year": 99,
    "price_month": 120,
    "price_decimals": 0,
    "button": "Choose",
    "primary": true,
    "features": [
      {"name": "first"},
      {"name": "second"}
    ]
  }

  // example plans
  - name: Pro
    price_year: 99
    price_month: 120
    price_decimals: 0
    button: Choose
    primary: true
    features:
      - name: Lorem ipsum
      - name: Dolor sit amet
      - name: Consectetur
      - name: Adipiscing elit
  - name: Enterprise
    price_text: Let's talk
    button: Contact us
    button_href: mailto:hello@beautifulsaas.com
    features:
      - name: Lorem ipsum
      - name: Dolor sit amet
      - name: Consectetur
      - name: Adipiscing elit
*/

class FeatureData {
  name?: string
}

class PlanData {
  provider?: string
  stripe?: any // when we add new providers this must be updated
  ref?: string
  display?: boolean
  name?: string
  primary?: boolean
  price_year?: number
  price_month?: number
  price_decimals: 0
  price_text?: string
  free_trial?: number
  button?: string
  button_href?: string
  features: FeatureData[]
}
@Entity({ name: 'plans' })
export class PlanEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column('json')
  data: PlanData

  /**
  * Set values in this from values in this.data
  */
  @AfterLoad()
  public setValuesFromJson (): any {
  // json parsing is done automatically
    const data = this.data ?? {}
    for (const key in data) {
      if (!(key in this)) {
        this[key] = data[key]
      }
    }
  }

  /**
  * Set values in this.data from values in json
  */
  public async setJsonFromValues (): Promise<any> {
    const data = new PlanData()
    Object.keys(data).forEach(key => {
      if (key in this) {
        // if (key === 'features') {

        //   this[key].forEach(feature => {

        //   })
        // }
        const castedKey: string = key
        data[castedKey] = this[key]
      }
    })
    this.data = data
  }

  constructor () {
    this.data = new PlanData()
    this.data.features = []
  }

  // Getters

  public isPrimary (): boolean {
    return this.data.primary === true
  }

  public isExternal (): boolean {
    return this.data.provider === 'external'
  }

  public isFreeTier (): boolean {
    const priceMonth = this.data?.price_month ?? 0
    const priceYear = this.data?.price_year ?? 0

    return priceMonth === 0 && priceYear === 0
  }

  /**
   * @returns ref if defined, otherwise the name without spaces
   */
  public getRef (): string {
    return this.data.ref ?? this.data?.name?.replace(' ', '').toLowerCase() ?? ''
  }

  public hasRef (ref): boolean {
    return this.getRef() === ref
  }

  /**
   * Make sure that if one interval is not defined, it cannot be chosen
   * @param interval the privcing interval
   * @returns the sanitized interval
   */
  public getInterval (intervalHandle): string {
    const priceMonth = this.data?.price_month ?? 0
    const priceYear = this.data?.price_year ?? 0

    if (priceMonth > 0 && priceYear === 0) {
      return 'month'
    }

    if (priceYear > 0 && priceMonth === 0) {
      return 'year'
    }

    return intervalHandle === 'month' ? 'month' : 'year'
  }

  /**
   * @param interval the privcing interval
   * @returns monthly price if interval is "month"; yearly price otherwise
   */
  public getIntervalPrice (interval): number|null {
    return (interval === 'month' ? this.data?.price_month : this.data?.price_year) ?? null
  }

  public getProvider (): string {
    // TODO
    return this.data?.provider ?? 'stripe'
  }

  public getProviderData (): any {
    const provider = this.getProvider()
    return this.data[provider] ?? {}
  }

  public getName (): string {
    return this.data.name ?? ''
  }

  public getDescription (): string {
    // description not yet supported
    return this.getName()
  }
}
