import * as uuid from 'uuid'

import Reporter, { HumbugConsent } from '@bugout/humbug'

const HUMBUG_TOKEN = 'a4bb7056-94b9-4857-893e-dc8e4fa41345'

const packagePath = process.cwd()
const packageConfigFile = require(`${packagePath}/package.json`)
export let tags: string[] = [packageConfigFile.version]


type reportingConfigType = {
    clientId: string
    consent: boolean
}


const getReportingConfig = (): reportingConfigType => {
    let reportingConfig: reportingConfigType
    const fs = require('fs')
    try {
        const reportingConfigRaw = fs.readFileSync(`${packagePath}/reporting_config.json`, 'utf8')
        const reportingConfigJson = JSON.parse(reportingConfigRaw)
        reportingConfig = { clientId: reportingConfigJson.clientId, consent: reportingConfigJson.consent }
    } catch {
        reportingConfig = { clientId: uuid.v4(), consent: true }
        fs.writeFile(`${packagePath}/reporting_config.json`, JSON.stringify(reportingConfig), (err: Error) => {
            if (err) {
                console.log("Unable to create reporting_config.json file")
            }
        })
    }

    return reportingConfig
}

const sessionId = uuid.v4()
const loadedReportingConfig = getReportingConfig()
const clientId = loadedReportingConfig.clientId

const saasform_consent = new HumbugConsent(loadedReportingConfig.consent)
export const saasform_reporter = new Reporter(
    'saasform',
    saasform_consent,
    clientId,
    sessionId,
    HUMBUG_TOKEN
)
