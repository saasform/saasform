import { Field, InputType } from '@nestjs/graphql'
import { MaxLength } from 'class-validator'

@InputType()
class UserJson {
  @Field()
  name: string

  @Field()
  email: string
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
