
import { FilterableField } from '@nestjs-query/query-graphql'
import { ObjectType, ID } from '@nestjs/graphql'

@ObjectType('User')
export class UserDTO {
  @FilterableField(() => ID)
  id!: number

  @FilterableField()
  email: string

  @FilterableField()
  name: string
}
