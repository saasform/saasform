import { ContextIdFactory, ModuleRef } from '@nestjs/core'
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable } from 'rxjs'
import { AuthService } from 'src/auth/auth.service'

@Injectable()
export class JwtInterceptor implements NestInterceptor {
  constructor (
    // do not inject AuthService directly to reduce dependencies
    // private readonly authService: AuthService
    private readonly moduleRef: ModuleRef
  ) { }

  async intercept (context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const ctx = context.switchToHttp()
    const response = ctx.getResponse()
    const request: any = ctx.getRequest<Request>()

    // TODO: improve condition
    if (request.user != null && request.user !== false) {
      const contextId = ContextIdFactory.getByRequest(request)
      const authService = await this.moduleRef.resolve(AuthService, contextId)
      await authService.setJwtCookie(request, response, request.user)
    }

    return next.handle()
  }
}
