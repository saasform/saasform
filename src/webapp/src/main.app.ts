import * as helmet from 'helmet'

import { join } from 'path'
import { ValidationPipe } from '@nestjs/common'
import { Liquid } from 'liquidjs'
import * as bodyParser from 'body-parser'
import * as cookieParser from 'cookie-parser'
import * as csurf from 'csurf'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'

import { HttpExceptionsFilter } from './filters/http-exceptions.filter'
import { ApiModule } from './api/api.module'

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

const DISABLE_HELMET_AND_CSRF = [
  /^\/api\//,
  /^\/graphql/,
  /^\/auth\/[a-z]+\/callback/
]

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
    for (const ex of DISABLE_HELMET_AND_CSRF) {
      if (req.path.match(ex) != null) {
        return next()
      }
    }
    return helmet()(req, res, next)
  })

  app.useGlobalPipes(new ValidationPipe())
  app.useGlobalFilters(new HttpExceptionsFilter())

  app.enableCors({
    origin: (origin, callback) => {
      return callback(null, true)
    },
    credentials: true
  })

  const csrf = csurf({ cookie: true, signed: true, secure: true, httpOnly: true, sameSite: true })
  if (isTest) {
    // mock csurf
    app.use((req, res, next) => {
      req.csrfToken = () => ('')
      return next()
    })
  } else {
    app.use((req, res, next) => {
      // skip CSRF for api, graphql, auth callbacks
      for (const ex of DISABLE_HELMET_AND_CSRF) {
        if (req.path.match(ex) != null) {
          return next()
        }
      }
      return csrf(req, res, next)
    })
  }

  const config = new DocumentBuilder()
    .setTitle('Saasform API')
    .setDescription('Saasform API')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('__session')
    .build()
  const document = SwaggerModule.createDocument(app, config, {
    include: [ApiModule]
  })
  SwaggerModule.setup('api/v1', app, document)
}
