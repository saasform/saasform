import { Field, InputType } from '@nestjs/graphql'
import { MaxLength } from 'class-validator'

@InputType()
export class UserJson {
  @Field()
  name: string

  @Field()
  email: string

  @Field()
  emailConfirmed?: boolean = false
};

@InputType('NewUser')
export class NewUserInput {
  @Field()
  @MaxLength(128)
  email: string

  @Field()
  data?: UserJson

  @Field()
  @MaxLength(128)
  password: string
}
