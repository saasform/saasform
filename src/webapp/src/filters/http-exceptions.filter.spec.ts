import {
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException
} from '@nestjs/common'
import { HttpExceptionsFilter } from './http-exceptions.filter'

const mockHost: any = {
  switchToHttp: jest.fn().mockReturnValue({})
}

console.log = jest.fn().mockReturnThis()

describe('HttpExceptionsFilter', () => {
  beforeEach(async () => {
    mockHost.switchToHttp = jest.fn().mockReturnValue({
      getResponse: jest.fn().mockReturnValue({
        statusCode: jest.fn().mockReturnThis(),
        render: jest.fn().mockReturnThis(),
        redirect: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      }),
      getRequest: jest.fn().mockReturnValue({
        originalUrl: '/testUrl',
        query: {},
        tenantId: 'mytenant'
      })
    })
  })

  it('should be defined', () => {
    expect(new HttpExceptionsFilter()).toBeDefined()
  })

  it('should redirect to /login?next=... (UnauthorizedException)', () => {
    const filter = new HttpExceptionsFilter()
    const exception: UnauthorizedException = new UnauthorizedException()
    const mockResponse = mockHost.switchToHttp().getResponse()
    filter.catch(exception, mockHost)
    expect(mockResponse.redirect).toHaveBeenCalledWith('/login?next=/testUrl')
  })

  it('should redirect to / (UnauthorizedException, admin)', () => {
    const filter = new HttpExceptionsFilter()
    const exception: UnauthorizedException = new UnauthorizedException('admin')
    const mockResponse = mockHost.switchToHttp().getResponse()
    filter.catch(exception, mockHost)
    expect(mockResponse.redirect).toHaveBeenCalledWith('/')
  })

  it('should redirect to /login?next=... (ForbiddenException)', () => {
    const filter = new HttpExceptionsFilter()
    const exception: ForbiddenException = new ForbiddenException()
    const mockResponse = mockHost.switchToHttp().getResponse()
    filter.catch(exception, mockHost)
    expect(mockResponse.redirect).toHaveBeenCalledWith('/login?next=/testUrl')
  })

  it('should redirect to /login without next (ForbiddenException)', () => {
    const filter = new HttpExceptionsFilter()
    const exception: ForbiddenException = new ForbiddenException()
    mockHost.switchToHttp().getRequest = jest.fn().mockReturnValue({
      originalUrl: '/login',
      query: {}
    })
    const mockResponse = mockHost.switchToHttp().getResponse()
    filter.catch(exception, mockHost)
    expect(mockResponse.redirect).toHaveBeenCalledWith('/login')
  })

  it('should redirect to /login preserving next (ForbiddenException)', () => {
    const filter = new HttpExceptionsFilter()
    const exception: ForbiddenException = new ForbiddenException()
    mockHost.switchToHttp().getRequest = jest.fn().mockReturnValue({
      originalUrl: '/login?next=/testUrl2',
      query: {
        next: '/testUrl2'
      }
    })
    const mockResponse = mockHost.switchToHttp().getResponse()
    filter.catch(exception, mockHost)
    expect(mockResponse.redirect).toHaveBeenCalledWith('/login?next=/testUrl2')
  })

  it('should return 404 (NotFoundException)', () => {
    const filter = new HttpExceptionsFilter()
    const exception: NotFoundException = new NotFoundException()
    const mockResponse = mockHost.switchToHttp().getResponse()
    filter.catch(exception, mockHost)
    expect(mockResponse.render).toHaveBeenCalledWith('default/404', {
      root_assets: '/default'
    })
  })

  it('should return 500', () => {
    const filter = new HttpExceptionsFilter()
    const exception: BadRequestException = new BadRequestException()
    const mockResponse = mockHost.switchToHttp().getResponse()
    filter.catch(exception, mockHost)
    expect(mockResponse.render).toHaveBeenCalledWith('default/500', {
      root_assets: '/default'
    })
  })

  it('should return 500 ignoring tenantId', () => {
    const filter = new HttpExceptionsFilter()
    const exception: BadRequestException = new BadRequestException('Failed to lookup view mytenant/500')
    const mockResponse = mockHost.switchToHttp().getResponse()
    filter.catch(exception, mockHost)
    expect(mockResponse.render).toHaveBeenCalledWith('default/500', {
      root_assets: '/default'
    })
  })

  it('should return the exception in json (UnauthorizedException)', () => {
    const filter = new HttpExceptionsFilter()
    const exception: UnauthorizedException = new UnauthorizedException('Invalid email or password')
    mockHost.switchToHttp().getRequest = jest.fn().mockReturnValue({
      originalUrl: '/login',
      query: {
        json: true
      }
    })
    const mockResponse = mockHost.switchToHttp().getResponse()
    filter.catch(exception, mockHost)
    expect(mockResponse.status).toHaveBeenCalledWith(401)
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized', message: 'Invalid email or password', statusCode: 401 })
  })

  it('should return the exception in json (InternalServerErrorException)', () => {
    const filter = new HttpExceptionsFilter()
    const exception: Error = new Error('unknown error')
    mockHost.switchToHttp().getRequest = jest.fn().mockReturnValue({
      originalUrl: '/login',
      query: {
        json: true
      }
    })
    const mockResponse = mockHost.switchToHttp().getResponse()
    filter.catch(exception, mockHost)
    expect(mockResponse.status).toHaveBeenCalledWith(500)
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Internal Server Error', statusCode: 500 })
  })

  // it('should redirect to / (Subscription not active admin)', () => {
  //   const filter = new HttpExceptionsFilter();
  //   const exception: UnauthorizedException = new UnauthorizedException('Subscription not active');
  //   const mockResponse = mockHost.switchToHttp().getResponse();
  //   filter.catch(exception, mockHost);
  //   expect(mockResponse.redirect).toHaveBeenCalledWith('/accounts/billing');
  // });
})
