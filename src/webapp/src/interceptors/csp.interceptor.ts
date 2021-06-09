import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable } from 'rxjs'
import { contentSecurityPolicy } from 'helmet'
import { mergeWith } from 'lodash'

@Injectable()
export class CspInterceptor implements NestInterceptor {
  async intercept (context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const ctx = context.switchToHttp()
    const res = ctx.getResponse()
    const req: any = ctx.getRequest<Request>()

    if (req === undefined) {
      return next.handle()
    }

    const fixedDirectives = {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        // TODO move to nonce
        "'unsafe-inline'",
        // alpinejs requires unsafe-eval :(
        "'unsafe-eval'",
        // google tag manager and analytics
        'https://www.googletagmanager.com',
        // google signin
        'https://apis.google.com',
        // facebook pixel
        'https://connect.facebook.net',
        // stripe
        'https://js.stripe.com/v3/'
      ],
      frameSrc: [
        "'self'",
        'https://accounts.google.com',
        // stripe
        'https://js.stripe.com/v3/'
      ],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: [
        "'self'",
        // google fonts
        'https://fonts.gstatic.com'
      ],
      mediaSrc: [
        "'self'"
      ],
      imgSrc: [
        "'self'",
        'data:',
        // gravatar
        'https://secure.gravatar.com',
        // facebook pixel
        'https://www.facebook.com'
      ],
      connectSrc: [
        "'self'",
        'https://www.google-analytics.com'
      ]
    }

    if (req.path === '/' || req.unsafeDisableCsp === true) {
      const csp = contentSecurityPolicy({
        directives: {
          defaultSrc: ['*', "'unsafe-inline'", "'unsafe-eval'", 'data:']
        }
      })
      csp(req, res, () => {})
    } else {
      const directives = mergeWith(fixedDirectives, ...req.customCsp, (objValue, srcValue) => { return objValue.concat(srcValue) })
      const csp = contentSecurityPolicy({ directives })
      csp(req, res, () => {})
    }

    return next.handle()
  }
}
