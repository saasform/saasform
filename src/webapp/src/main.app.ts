import * as helmet from 'helmet'

import { join } from 'path'
import { ValidationPipe } from '@nestjs/common'
import { Liquid } from 'liquidjs'
import * as bodyParser from 'body-parser'
import * as cookieParser from 'cookie-parser'
import * as csurf from 'csurf'

import { HttpExceptionsFilter } from './filters/http-exceptions.filter'
import { saasform_reporter, tags } from './utilities/reporting'

// import { HttpExceptionsFilter } from './filters/http-exceptions.filter';

// add '.' at the end of the string, unless it's there already
function formatDot (s: string): string {
  if (s == null) {
    return ''
  }
  if (['.', '!', '?', ')', ']'].includes(s[s.length - 1])) {
    return s
  }
  return s + '.'
}

// replace the last ' ' (space) with &nbsp; + add '.'
function formatNoOrphanDot (s: string): string {
  return formatDot(s).replace(/ ([^ ]+)$/, '&nbsp;$1').replace(/\n/g, '<br/>')
}

export function configureApp (app, isTest: boolean = false): void {
  const engine = new Liquid({ jsTruthy: true, extname: '.liquid' })
  engine.registerFilter('formatDot', formatDot)
  engine.registerFilter('formatNoOrphanDot', formatNoOrphanDot)

  app.engine('liquid', engine.express())
  app.useStaticAssets(join(__dirname, '..', 'themes'), {
    index: false
  })
  app.setBaseViewsDir(join(__dirname, '..', 'themes'))
  app.setViewEngine('liquid')

  app.use(cookieParser())
  app.use(bodyParser.urlencoded({ extended: false }))
  app.use((req, res, next) => {
    // for website CSP see csp.interceptor.ts
    req.customCsp = []
    helmet()(req, res, next)
  })

  app.useGlobalPipes(new ValidationPipe())
  app.useGlobalFilters(new HttpExceptionsFilter())
  saasform_reporter.systemReport(tags, true)

  const csrf = csurf({ cookie: true, signed: true, secure: true, httpOnly: true, sameSite: true })
  if (isTest) {
    // mock csurf
    app.use((req, res, next) => {
      req.csrfToken = () => ('')
      next()
    })
  } else {
    app.use((req, res, next) => {
      if (req.path.indexOf('/graphql') >= 0 || req.path.indexOf('/api') >= 0) { // TODO: refactor this
        next()
      } else {
        csrf(req, res, next)
      }
    })
  }
}
