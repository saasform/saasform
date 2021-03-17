import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable } from 'rxjs'
import { AuthService } from 'src/auth/auth.service'

@Injectable()
export class JwtInterceptor implements NestInterceptor {
  constructor (
    private readonly authService: AuthService
  ) { }

  async intercept (context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const ctx = context.switchToHttp()
    const response = ctx.getResponse()
    const request: any = ctx.getRequest<Request>()
    request.user != null && await this.authService.setJwtCookie(request, response, request.user)

    return next.handle()
  }
}
