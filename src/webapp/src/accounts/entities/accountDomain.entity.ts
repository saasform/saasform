import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('accounts_domains')
export class AccountDomainEntity {
  @PrimaryGeneratedColumn()
  id: number

  @CreateDateColumn()
  created!: Date

  @UpdateDateColumn()
  updated!: Date

  @Column({ default: '' })
  domain: string

  @Column('json')
  data: any
}
