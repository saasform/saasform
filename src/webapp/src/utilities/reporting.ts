import * as uuid from 'uuid'

import Reporter, { HumbugConsent } from '@bugout/humbug'

const HUMBUG_TOKEN = '3bafba59-f078-4004-ab12-fa27cf4885f1'

const packagePath = process.cwd()
const packageConfigFile = require(`${packagePath}/package.json`)
export let tags: string[] = [packageConfigFile.version]

const sessionId = uuid.v4()
let clientId = process.env['SAASFORM_REPORTER_CLIENT_ID']
if (clientId === undefined) {
	clientId = uuid.v4()
}

const saasform_consent = new HumbugConsent(true)
export const saasform_reporter = new Reporter(
	'saasform',
	saasform_consent,
	clientId,
	sessionId,
	HUMBUG_TOKEN
)
