import { ObjectType, Field, ID } from '@nestjs/graphql'
import { FilterableField } from '@nestjs-query/query-graphql'

@ObjectType('Plan')
export class PlanDTO {
  @FilterableField(() => ID)
  id!: number

  @Field()
  plan!: string
}
