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
    const response = ctx.getResponse()
    const request: any = ctx.getRequest<Request>()
    const requestUser = JSON.stringify(request.user)

    if (request === undefined) {
      return next.handle()
    }

    response.header('X-Powered-By', 'Saasform')

    return next.handle().pipe(map(async data => {
      try {
        if (request.user != null && request.user !== false && JSON.stringify(request.user) !== requestUser) {
          // request.user has changed, we must issue another JWT
          await this.authService.setJwtCookie(request, response, request.user)
        }
      } catch (err) {
        // pass
      }
      return data
    }))
  }
}
