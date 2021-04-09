import { Field, ID, ObjectType } from '@nestjs/graphql'

@ObjectType()
class Feature {
  @Field()
  name: string

  @Field({ nullable: true })
  value: string
}
@ObjectType()
class Price {
  @Field()
  id: string

  @Field()
  unit_amount_decimal: string

  @Field({ nullable: true })
  unit_amount_hr?: string
}

@ObjectType()
class Prices {
  @Field()
  month: Price

  @Field()
  year: Price
}

@ObjectType()
export class Plan {
  @Field(type => ID)
  id: string

  @Field(type => ID)
  uid: number

  @Field()
  description: string

  @Field({ nullable: true })
  name?: string

  @Field()
  prices: Prices

  @Field({ nullable: true })
  limitUsers?: string

  @Field({ nullable: true })
  freeTrial?: string

  @Field({ nullable: true })
  priceText?: string

  @Field(type => [Feature], { nullable: true })
  features: [Feature]
}
