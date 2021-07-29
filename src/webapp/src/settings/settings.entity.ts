import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  AfterLoad
} from 'typeorm'

enum HidOptDisFormField {
  Hidden = 'hidden',
  Optional = 'optional',
  Disabled = 'disabled',
}

enum ReqOptDisFormField {
  Required = 'required',
  Optional = 'optional',
  Disabled = 'disabled',
}

enum ReqFullNameFormField {
  Full = 'required_full_name',
  Last = 'required_last_name',
}

export class SettingsUserJson {
  // user
  allowedKeys: any = ['email', 'name']
}
export class SettingsWebsiteJson {
  // website
  title: string
  description: string
  google_analytics: string
  facebook_pixel_id: string
  google_tag_manager: string
  prelaunch_enabled: boolean
  prelaunch_cleartext_password: string
  prelaunch_message: string
  prelaunch_background: string
  prelaunch_hide_poweredby: boolean
  domain_primary: string
  domain_app: string
  insecure_domain_app: string
  name: string
  email: string
  email_name: string
  signup_billing_form: HidOptDisFormField
  signup_email_verification: ReqOptDisFormField
  signup_email_social_verification: boolean
  legal_name: string
  billing_form_full_name: ReqFullNameFormField
  billing_form_company_name: HidOptDisFormField
  billing_form_address_line2: HidOptDisFormField
  billing_form_phone_number: HidOptDisFormField
  subscription_optional: boolean
  trial_length: number
  unsafe_redirect_with_jwt?: string
}

export class SettingsAdminJson {
  // settings
  admin_email: string
  admin_email_name: string
  industry: string
  phone_country: string
  phone_number: string
  address_line1: string
  address_line2: string
  address_city: string
  address_zip: string
  address_state: string
  address_country: string
  pay_with_balance: boolean
  payout_rate_fixed: string
  payout_rate_percentage: string
  payout_rate_international_fixed: string
  payout_rate_international_percentage: string
  payout_statement: string
  payout_schedule: string
  customer_bill_statement: string
  customer_bill_phone_number: string
  trial_expiring_cron: string
  trial_expiring_days: number
}

export class SettingsKeysJson {
  // keys
  jwt_public_key: string
  jwt_private_key: string
  webhooks_key: string
  oauth_google_signin_client_id: string
  oauth_google_signin_client_secret: string
  oauth_google_signin_scope: string
  oauth_azure_ad_tenant_id: string
  oauth_azure_ad_client_id: string
  oauth_azure_ad_client_secret_value: string
  oauth_azure_ad_scope: string
  oidc_miracl_client_id: string
  oidc_miracl_client_secret: string
  stripe_account: string
  tokens: any
}

enum SettingsModulesHomepage {
  Saasform = 'saasform',
  Redirect = 'redirect',
}

enum SettingsModulesPayment {
  Stripe = 'stripe',
  Killbill = 'killbill',
}

enum SettingsModulesUserValues {
  Profile = 'profile',
  Security = 'security',
  Billing = 'billing',
  Team = 'team',
}

export class SettingsModulesJson {
  homepage: SettingsModulesHomepage
  payment: SettingsModulesPayment
  user: SettingsModulesUserValues[]
}

class SettingsJson extends SettingsWebsiteJson {
}

@Entity({ name: 'settings' })
export class SettingsEntity {
  @PrimaryGeneratedColumn()
  id!: string

  @Column()
  category!: string

  @Column('json')
  json?: SettingsWebsiteJson | SettingsAdminJson | SettingsKeysJson | SettingsUserJson

  @CreateDateColumn()
  created!: Date

  @UpdateDateColumn()
  updated!: Date

  @AfterLoad()
  public setValuesFromJson (): any {
    // json parsing is done automatically
    const data = this.json ?? {}
    for (const key in data) {
      if (this[key] == null) {
        this[key] = data[key]
      }
    }
    // this.json = new SettingsJson();
  }

  // BeforeUpdate doesn't work
  // @BeforeUpdate()
  public setJsonFromValues (): any {
    const FIELDS = ['id', 'category', 'json', 'created', 'updated']
    const data = new SettingsJson()
    for (const key in this) {
      if (this[key] != null && !FIELDS.includes(key)) {
        const castedKey: string = key
        data[castedKey] = this[key]
      }
    }
    this.json = data
  }
}
