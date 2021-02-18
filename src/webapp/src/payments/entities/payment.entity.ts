import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'

// TODO: use actual Stripe status
// export enum PaymentStatus {
//   ACTIVE = "active",
//   EXPIRED = "expired",
//   TRIALLING = "trialing",
//   UNKWNOWN = "unknown"
// }

@Entity('payments')
export class PaymentEntity {
  @PrimaryGeneratedColumn()
  id: number

  // This is needed to search by account
  @Column()
  account_id: number

  // This is needed to search by stripe id
  @Column()
  stripe_id: string

  /* For some reason this is giving issues.
     It complains saying that
     Database query failed: Data truncated for column 'column_name' at row 1
     See #39
   */
  // @Column({
  //   type: "enum",
  //   enum: PaymentStatus,
  //   default: PaymentStatus.UNKWNOWN
  // })
  // status: PaymentStatus;
  @Column()
  status: string

  @Column('json')
  data?: any
}
