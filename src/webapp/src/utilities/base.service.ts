// import { Query, DeleteManyResponse, UpdateManyResponse, DeepPartial, Class, QueryService, Filter, AggregateQuery, AggregateResponse, FindByIdOptions, GetByIdOptions, UpdateOneOptions, DeleteOneOptions, Filterable } from '@nestjs-query/core'
import { Repository, getRepository } from 'typeorm'
// import { FilterQueryBuilder } from '@nestjs-query/query-typeorm/dist/src/query/filter-query.builder'
// import { RelationQueryService } from '@nestjs-query/query-typeorm/dist/src/services/relation-query.service'
import { TypeOrmQueryService, TypeOrmQueryServiceOpts } from '@nestjs-query/query-typeorm'

/**
 * Base class for all services in Saasform.
 */
export class BaseService<T> extends TypeOrmQueryService<T> { // implements QueryService<Entity, DeepPartial<Entity>, DeepPartial<Entity>> {
  constructor (
    req: any, entity, opts?: TypeOrmQueryServiceOpts<T>) {
    const repo: Repository<T> = getRepository(entity)
    super(repo)
  }
}
