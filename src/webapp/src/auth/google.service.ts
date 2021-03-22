import { Injectable } from '@nestjs/common'
import { SettingsService } from '../settings/settings.service'
import { OAuth2Client } from 'google-auth-library'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class GoogleOAuth2Service {
  constructor (
    private readonly settingsService: SettingsService,
    private readonly configService: ConfigService
  ) {}

  async getUserPayload (idToken: string): Promise<any> {
    const keys = await this.settingsService.getKeysSettings()
    const audience = (keys?.auth_google_client_id) ?? this.configService.get<string>('GOOGLE_CLIENT_ID')
    const payload = await (await this._verify(idToken, audience)).getPayload()
    return payload
  }

  private async _verify (idToken: string, audience: string = ''): Promise<any> {
    const client = new OAuth2Client(audience)
    return await client.verifyIdToken({ audience, idToken })
  }
}
