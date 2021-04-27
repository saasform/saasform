import * as uuid from 'uuid'

import Reporter, { HumbugConsent } from '@bugout/humbug'

const HUMBUG_TOKEN = 'a4bb7056-94b9-4857-893e-dc8e4fa41345'
const HUMBUG_KB_ID = 'cc7624d7-84f2-4bf3-87f9-a4f603216d1d'

const config = require('../../package.json')
export let tags: string[] = [config.version]

const sessionId = uuid.v4()
let clientId = process.env['BUGOUT_HUMBUG_CLIENT_ID']
if (clientId === undefined) {
    clientId = uuid.v4()
}

const saasform_consent = new HumbugConsent(true)
export const saasform_reporter = new Reporter(
    'saasform',
    saasform_consent,
    clientId,
    sessionId,
    HUMBUG_TOKEN,
    HUMBUG_KB_ID
)
