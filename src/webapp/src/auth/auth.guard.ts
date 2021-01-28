import {
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common'

import { ModuleRef } from '@nestjs/core'
import { AuthGuard } from '@nestjs/passport'
import { AuthService } from './auth.service'
// import { GoogleService } from './google.service'

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
      throw new UnauthorizedException()
    }

    await this.authService.setJwtCookie(request, response, request.user)

    // BILLING
    // for admins "subscription" is always active
    // if (request.user.staff == null) {
    //   if (request.user.subscription_status == null || !['active', 'trialing'].includes(request.user.subscription_status)) {
    //     throw new UnauthorizedException('Subscription not active')
    //   }
    // }

    return result
  }
}

/*
@Injectable()
export class GoogleAuthGuard implements CanActivate {
  constructor (private readonly googleService: GoogleService) {
  }

  async canActivate (context: ExecutionContext): Promise<boolean> {
    let isOk = false
    const request = context.switchToHttp().getRequest()
    const googleUser = await this.googleService.getUser(request.body.idToken)
    if (googleUser?.email != null) {
      request.googleUser = googleUser
      isOk = true
    }
    return isOk
  }
}
*/

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

/*
@Injectable()
export class MustHaveSubscription extends AuthGuard('jwt') {
  handleRequest(err, user) {
    if (!user) {
      throw new UnauthorizedException('Subscription not active');
    }
    if (!user.staff) {
      if (!user.subscription || user.subscription.status != 'active') {
        throw new UnauthorizedException('Subscription not active');
      }
    }
    return user;
  }
}
*/

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
