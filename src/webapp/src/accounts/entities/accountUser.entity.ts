import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'

@Entity('accountsUsers')
export class AccountUserEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  account_id: number

  @Column()
  user_id: number
}
