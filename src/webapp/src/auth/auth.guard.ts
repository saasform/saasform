import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AuthService } from './auth.service'
import { GoogleOAuth2Service } from './google.service'

@Injectable()
export class LoginAuthGuard extends AuthGuard('local') {
  constructor (private readonly authService: AuthService) {
    super()
  }

  async canActivate (context: ExecutionContext): Promise<boolean> {
    const result = (await super.canActivate(context)) as boolean
    const request = context.switchToHttp().getRequest()
    const response = context.switchToHttp().getResponse()

    if (request?.user == null) {
      console.error('LoginAuthGuard - canActivate - user is null')
      throw new UnauthorizedException()
    }

    await this.authService.setJwtCookie(request, response, request.user)

    return result
  }
}
@Injectable()
export class UserRequiredAuthGuard extends AuthGuard('jwt') {}

@Injectable()
export class UserOptionalAuthGuard extends AuthGuard('jwt') {
  // Override handleRequest so it never throws an error
  handleRequest (err, user): any {
    err != null && console.error('UserOptionalAuthGuard', err)
    return user
  }
}

@Injectable()
export class AdminRequiredAuthGuard extends AuthGuard('jwt') {
  handleRequest (err, user, info, context): any {
    const u = super.handleRequest(err, user, info, context)
    if (u?.staff == null || u?.staff !== true) {
      throw new UnauthorizedException('admin')
    }
    return u
  }
}

@Injectable()
export class GoogleGuard implements CanActivate {
  constructor (
    private readonly authService: AuthService,
    private readonly googleService: GoogleOAuth2Service
  ) {}

  async canActivate (context: ExecutionContext): Promise<any> {
    const req = context.switchToHttp().getRequest()
    const profile = await this.googleService.getUserPayload(req.body.id_token)
    if (profile == null || profile.email == null) {
      return false
    }

    const accessToken = req?.body?.access_token ?? ''

    let refreshToken
    try {
      const tokens = await this.googleService.getOAuthTokens(req.body.code)
      refreshToken = tokens.refresh_token
    } catch (_) {
      // pass
    }

    const requestUser = await this.authService.authGoogle(req, profile, accessToken, refreshToken)
    req.user = requestUser

    return true
  }
}

@Injectable()
export class AzureAdGuard extends AuthGuard('azuread-openidconnect') {}

@Injectable()
export class MiraclGuard extends AuthGuard('miracl') {}

@Injectable()
export class OktaGuard extends AuthGuard('okta') {}

@Injectable()
export class BearerTokenGuard extends AuthGuard('bearer') {}
