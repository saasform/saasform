import {
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common'

import { ModuleRef } from '@nestjs/core'
import { AuthGuard } from '@nestjs/passport'
import { AuthService } from './auth.service'

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
    if (u?.staff == null) {
      throw new UnauthorizedException('admin')
    }
    return u
  }
}
