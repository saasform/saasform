import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common'

import { ModuleRef } from '@nestjs/core'
import { AuthGuard } from '@nestjs/passport'
import { AuthService } from './auth.service'
import { GoogleOAuth2Service } from './google.service'

@Injectable()
export class LoginAuthGuard extends AuthGuard('local') {
  constructor (private readonly moduleRef: ModuleRef,
    private readonly authService: AuthService) {
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
export class GoogleOAuth2Guard implements CanActivate {
  constructor (private readonly googleService: GoogleOAuth2Service) {
  }

  async canActivate (context: ExecutionContext): Promise<any> {
    const req = context.switchToHttp().getRequest()
    const user = await this.googleService.getUserPayload(req.body.idToken)
    if (user == null || user.email == null) {
      return false
    }

    req.google = { user }
    return true
  }
}
