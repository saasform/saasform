import {
  Entity, Column, AfterLoad,
  PrimaryGeneratedColumn
} from 'typeorm'

export class AccountData {
  name?: string
  stripe?: any
  killbill?: any
  payments_methods?: any
  billing_info?: any
  email_verification_required?: boolean
}

@Entity('accounts')
export class AccountEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  owner_id: number

  @Column('json')
  data: AccountData | any

  constructor () {
    this.data = new AccountData()
    this.owner_id = 0
  }

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
    const data = new AccountData()
    Object.keys(data).forEach(key => {
      if (key in this) {
        const castedKey: string = key
        data[castedKey] = this[key]
      }
    })
    this.data = data
  }

  public getPaymentProviderCustomer (): any {
    return ({
      name: this.data.name
    })
  }
}
