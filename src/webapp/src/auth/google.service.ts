import { Injectable } from "@nestjs/common";
import { SettingsService } from "../settings/settings.service";
import { OAuth2Client } from "google-auth-library";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class GoogleOAuth2Service {
  constructor(
    private settingsService: SettingsService,
    private configService: ConfigService
  ) {}

  async getUserPayload(idToken: string) {
    const keys = await this.settingsService.getKeysSettings();
    const audience = (keys && keys.auth_google_client_id) || this.configService.get<string>("GOOGLE_CLIENT_ID");
    const payload = await (await this._verify(audience, idToken)).getPayload();
    return payload;
  }

  private async _verify(audience: string = "", idToken: string) {
    const client = new OAuth2Client(audience);
    return await client.verifyIdToken({ audience, idToken});
  }
}