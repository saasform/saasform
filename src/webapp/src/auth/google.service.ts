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
    const settings = await this.settingsService.getWebsiteRenderingVariables()
    const clientId = settings?.app_google_signin_client_id ?? ''
    const payload = await (await this._verify(idToken, clientId)).getPayload()
    return payload
  }

  async getOAuthTokens (code: string): Promise<any> {
    const { clientID, clientSecret, redirectURI } = await this.settingsService.getGoogleStrategyConfig()

    if (clientSecret != null && clientSecret !== '' && code != null && code !== '') {
      const oAuth2Client = new OAuth2Client(
        clientID,
        clientSecret,
        redirectURI
      )

      const r = await oAuth2Client.getToken(code)

      return r.tokens
    }

    return {}
  }

  private async _verify (idToken: string, audience: string = ''): Promise<any> {
    const client = new OAuth2Client(audience)
    return await client.verifyIdToken({ audience, idToken })
  }
}
