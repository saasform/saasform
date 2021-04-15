import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable } from 'rxjs'
import { AuthService } from 'src/auth/auth.service'

import { contentSecurityPolicy } from 'helmet'
import { mergeWith } from 'lodash'

@Injectable()
export class CspInterceptor implements NestInterceptor {
  constructor (
    private readonly authService: AuthService
  ) { }

  async intercept (context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const ctx = context.switchToHttp()
    const res = ctx.getResponse()
    const req: any = ctx.getRequest<Request>()

    const fixedDirectives = {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        // TODO move to nonce
        "'unsafe-inline'",
        // alpinejs requires unsafe-eval :(
        "'unsafe-eval'",
        // google tag manager and analytics
        'www.googletagmanager.com',
        // google signin
        'apis.google.com',
        // facebook pixel
        'connect.facebook.net'
      ],
      frameSrc: [
        "'self'",
        'accounts.google.com'
      ],
      styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      fontSrc: [
        "'self'",
        // google fonts
        'fonts.gstatic.com'
      ],
      mediaSrc: [
        "'self'"
      ],
      imgSrc: [
        "'self'",
        'data:',
        // gravatar
        'secure.gravatar.com',
        // facebook pixel
        'www.facebook.com'
      ],
      connectSrc: [
        "'self'"
      ]
    }

    const directives = mergeWith(fixedDirectives, ...req.customCsp, (objValue, srcValue) => { return objValue.concat(srcValue) })
    const csp = contentSecurityPolicy({ directives })
    csp(req, res, () => {})

    return next.handle()
  }
}
