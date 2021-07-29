import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Scope } from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { AuthService } from '../auth/auth.service'

@Injectable({ scope: Scope.REQUEST })
export class JwtInterceptor implements NestInterceptor {
  constructor (
    // do not inject AuthService directly to reduce dependencies
    private readonly authService: AuthService
  ) { }

  async intercept (context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const ctx = context.switchToHttp()
    const res = ctx.getResponse()
    const req: any = ctx.getRequest<Request>()
    const requestUser = JSON.stringify(req.user)

    if (req === undefined) {
      return next.handle()
    }

    res.header('X-Powered-By', 'Saasform')

    return next.handle().pipe(map(async data => {
      if (req.userUpdated === true) {
        const validUser = await this.authService.getUserInfo(req.user.email)
        if (validUser != null) {
          req.user = await this.authService.getTokenPayloadFromUserModel(validUser)
        }
      }

      try {
        if (req.user != null && req.user !== false && JSON.stringify(req.user) !== requestUser) {
          // req.user has changed, we must issue another JWT
          await this.authService.setJwtCookie(req, res, req.user)
        }
      } catch (err) {
        // pass
      }
      return data
    }))
  }
}
