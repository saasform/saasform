export interface RequestUser {
  nonce: string

  id: number
  account_id: number
  account_name?: string
  status: string // active, subscrition_<status>

  email: string
  email_verified: boolean
  staff: boolean

  data?: any // FIXME: change this to a proper object with the user data fields?

  subscription_id?: number // payment id
  subscription_plan?: number // plan id
  subscription_status?: string // trialing, active, incomplete, incomplete_expired, past_due, canceled, or unpaid
  payment_status?: boolean // inidicates if a payment method is present
  subscription_expiration?: number // timestamp
}
