import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Scope } from '@nestjs/common'
import { Observable } from 'rxjs'
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

    // TODO: improve condition
    if (request.user != null && request.user !== false) {
      await this.authService.setJwtCookie(request, response, request.user)
    }
    return next.handle()
  }
}
