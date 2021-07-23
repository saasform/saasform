import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException
} from '@nestjs/common'
import { Request, Response } from 'express'
import { saasformReporter, tags } from '../utilities/reporting'
import { UnauthorizedWithRedirectException } from '../auth/auth.service'

@Catch()
export class HttpExceptionsFilter implements ExceptionFilter {
  async catch (exception: Error, host: ArgumentsHost): Promise<any> {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request: any = ctx.getRequest<Request>()

    let requestAccept = null

    try {
      requestAccept = request.get('Accept')
    } catch (err) {
      console.log(err)
    }

    console.error('HttpExceptionsFilter - received exception', exception)
    saasformReporter.errorReport(exception, tags, true).then(() => {}, () => {})

    if (exception instanceof UnauthorizedWithRedirectException) {
      return response.redirect(exception.redirect)
    }

    if (requestAccept != null && requestAccept === 'application/json') {
      if (exception instanceof UnauthorizedException) {
        return response.json({
          statusCode: 401,
          message: 'Unauthorized'
        })
      }

      return response.json({
        statusCode: 500,
        message: 'Error'
      })
    }

    // This needs to be first because it is a special
    // kind of unauthrized that does not trigger any
    // logout and needs to return a 302
    if (
      exception instanceof UnauthorizedException &&
      exception.message === 'Subscription not active'
    ) {
      if (request.is('json') === true || request?.query?.json != null) {
        return response.json({
          statusCode: 302,
          message: 'Found',
          redirect: '/user/billing'
        })
      }

      return response.redirect('/user/billing')
      // TODO
      // response.redirect('/user');
    }

    const e = exception instanceof HttpException ? exception : new InternalServerErrorException()
    if (request?.query?.json != null) {
      return response
        .status(e.getStatus())
        .json(e.getResponse())
    }

    const themeRoot = request?.websiteData?.themeRoot as string ?? 'default'
    const assetsRoot: string = request?.websiteData?.assetsRoot ?? `/${themeRoot}`
    const websiteData = request?.websiteData ?? { root_assets: assetsRoot }
    const data = {
      ...websiteData,
      user: request.user
    }

    if (
      // view doesn't exist
      exception.message.startsWith('Failed to lookup view') ||
      // csrf token
      exception.message.startsWith('invalid csrf token')
    ) {
      response.statusCode = 500
      response.render(`${themeRoot}/500`, data)
    } else if (
      exception instanceof UnauthorizedException ||
      exception instanceof ForbiddenException
    ) {
      let next: string = ''
      const originalUrl = request.originalUrl

      switch (exception.message) {
        case 'admin':
          response.redirect('/')
          break
        case 'Invalid email or password':
          response.render(`${themeRoot}/error`, { error: 'Invalid email or password' })
          break
        default:
          if (originalUrl.startsWith('/login') === true) {
            next = request.query.next
          } else {
            next = originalUrl
          }

          if (next != null && next !== '' && !next.startsWith('/auth/')) {
            response.redirect(`/login?next=${next}`)
          } else {
            response.redirect('/login')
          }
      }
    } else if (exception instanceof NotFoundException) {
      response.statusCode = 404
      response.render(`${themeRoot}/404`, data)
    } else {
      console.error('HttpExceptionsFilter - generic exception', exception)
      response.statusCode = 500
      response.render(`${themeRoot}/500`, data)
    }
  }
}
