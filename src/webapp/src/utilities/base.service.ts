import { Repository, getRepository } from 'typeorm'
import { TypeOrmQueryService, TypeOrmQueryServiceOpts } from '@nestjs-query/query-typeorm'

/**
 * Base class for all services in Saasform.
 */
export class BaseService<T> extends TypeOrmQueryService<T> {
  constructor (
    req: any, entity, opts?: TypeOrmQueryServiceOpts<T>) {
    const repo: Repository<T> = getRepository(entity)
    super(repo)
  }
}
