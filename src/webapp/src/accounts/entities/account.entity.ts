import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'

export class AccountData {
  name?: string
  stripe?: any
  payments_methods?: any
  billing_info?: any
}

@Entity('accounts')
export class AccountEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  owner_id: number

  @Column('json')
  data?: AccountData | any
}
