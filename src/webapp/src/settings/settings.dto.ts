import { FilterableField } from '@nestjs-query/query-graphql'
import { ObjectType, GraphQLISODateTime, Field, ID } from '@nestjs/graphql'

@ObjectType('SettingsItem')
export class SettingsItemDTO {
  @FilterableField(() => ID)
  id!: number

  @FilterableField()
  category!: string

  // json MUST never be exposed via DTO/graphql
  // @Field({ nullable: true })
  // json?: string;

  @Field(() => GraphQLISODateTime)
  created!: Date

  @Field(() => GraphQLISODateTime)
  updated!: Date

  /* fields */

  @Field({ nullable: true })
  title?: string

  @Field({ nullable: true })
  description?: string

  @Field({ nullable: true })
  google_analytics?: string

  @Field({ nullable: true })
  facebook_pixel_id?: string

  @Field({ nullable: true })
  google_tag_manager?: string

  @Field({ nullable: true })
  prelaunch_enabled?: boolean

  @Field({ nullable: true })
  prelaunch_cleartext_password?: string

  @Field({ nullable: true })
  prelaunch_message?: string

  @Field({ nullable: true })
  domain_primary?: string

  @Field({ nullable: true })
  domain_app?: string

  @Field({ nullable: true })
  jwt_public_key?: string

  @Field({ nullable: true })
  auth_password?: boolean

  @Field({ nullable: true })
  auth_google?: boolean

  @Field({ nullable: true })
  auth_google_client_id?: string

  @Field({ nullable: true })
  auth_facebook?: boolean

  @Field({ nullable: true })
  name?: string

  @Field({ nullable: true })
  email?: string

  @Field({ nullable: true })
  email_name?: string

  @Field({ nullable: true })
  signup_billing_form?: string

  @Field({ nullable: true })
  signup_email_verification?: string

  @Field({ nullable: true })
  signup_email_social_verification?: boolean

  @Field({ nullable: true })
  billing_form_full_name?: string

  @Field({ nullable: true })
  billing_form_company_name?: string

  @Field({ nullable: true })
  billing_form_address_line2?: string

  @Field({ nullable: true })
  billing_form_phone_number?: string

  @Field({ nullable: true })
  admin_email?: string

  @Field({ nullable: true })
  admin_email_name?: string

  @Field({ nullable: true })
  industry?: string

  @Field({ nullable: true })
  legal_name?: string

  @Field({ nullable: true })
  phone_country?: string

  @Field({ nullable: true })
  phone_number?: string

  @Field({ nullable: true })
  address_line1?: string

  @Field({ nullable: true })
  address_line2?: string

  @Field({ nullable: true })
  address_city?: string

  @Field({ nullable: true })
  address_zip?: string

  @Field({ nullable: true })
  address_state?: string

  @Field({ nullable: true })
  address_country?: string

  @Field({ nullable: true })
  pay_with_balance?: boolean

  @Field({ nullable: true })
  payout_rate_fixed?: string

  @Field({ nullable: true })
  payout_rate_percentage?: string

  @Field({ nullable: true })
  payout_rate_international_fixed?: string

  @Field({ nullable: true })
  payout_rate_international_percentage?: string

  @Field({ nullable: true })
  payout_statement?: string

  @Field({ nullable: true })
  payout_schedule?: string

  @Field({ nullable: true })
  customer_bill_statement?: string

  @Field({ nullable: true })
  customer_bill_phone_number?: string

  // IMPORTANT - do NOT add jwt_private_key
  // @Field({ nullable: true })
  // jwt_private_key?: string;

  @Field({ nullable: true })
  webhooks_key?: string

  @Field({ nullable: true })
  auth_google_secret?: string
}
