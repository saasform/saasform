import * as uuid from 'uuid'

import Reporter, { HumbugConsent } from '@bugout/humbug'

const HUMBUG_TOKEN = process.env.HUMBUG_TOKEN

const version = process.env.npm_package_version ?? ''
export const tags: string[] = [version]

const sessionId = uuid.v4()
let clientId = process.env.SAASFORM_REPORTER_CLIENT_ID
if (clientId === undefined) {
  clientId = uuid.v4()
}

const consent = new HumbugConsent(HUMBUG_TOKEN !== undefined)
export const saasformReporter = new Reporter(
  'saasform',
  consent,
  clientId,
  sessionId,
  HUMBUG_TOKEN
)
