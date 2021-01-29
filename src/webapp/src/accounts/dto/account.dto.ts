
import { FilterableField } from '@nestjs-query/query-graphql'
import { ObjectType, ID } from '@nestjs/graphql'

@ObjectType('Account')
export class AccountDTO {
  @FilterableField(() => ID)
  id!: number

  @FilterableField()
  data!: string
}
