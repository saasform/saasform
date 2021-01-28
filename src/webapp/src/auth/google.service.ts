/*
import { Injectable } from '@nestjs/common'
import { SettingsService } from '../settings/settings.service'
const { OAuth2Client } = require('google-auth-library')

const CLIENT_ID = '918644563577-abpbj38t7iuhdttlahcuag6vf621el7p.apps.googleusercontent.com'

@Injectable()
export class GoogleService {
  constructor (private readonly settingsService: SettingsService) {
  }

  async getUser (idToken) {
    const keys = await this.settingsService.getKeysSettings()
    const auth_google_client_id = keys && keys.auth_google_client_id || CLIENT_ID
    const client = new OAuth2Client(auth_google_client_id)
    const ticket = await client.verifyIdToken({ audience: auth_google_client_id, idToken })
    const payload = ticket.getPayload()
    return payload
  }
};
*/
