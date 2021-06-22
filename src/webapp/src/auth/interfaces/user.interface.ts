export interface RequestUser {
  nonce: string

  status: string // active, unpaid

  id: number
  email: string
  email_verified: boolean
  staff: boolean
  username?: string

  account_id: number
  account_name?: string

  subs_exp?: number // timestamp
  subs_name?: string // subscription name
  subs_status?: string // [saasform:] disabled, external, [stripe:] trialing, active, incomplete, incomplete_expired, past_due, canceled, or unpaid
}

export class ValidUser {
  user: any
  credential: any
  account: any
}
