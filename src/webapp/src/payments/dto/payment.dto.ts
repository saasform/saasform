import { FilterableField } from '@nestjs-query/query-graphql'
import { ObjectType, ID } from '@nestjs/graphql'

@ObjectType('Payment')
export class PaymentDTO {
  @FilterableField(() => ID)
  id!: number

  @FilterableField()
  json!: string
}
