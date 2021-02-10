import { TypeOrmModuleOptions } from '@nestjs/typeorm'

export const DB_CONFIG: TypeOrmModuleOptions = {
  type: 'mysql',
  dropSchema: true,
  host: 'localhost',
  port: 3306,
  username: 'test',
  password: 'testp',
  database: 'db_test',
  autoLoadEntities: true,
  synchronize: true
}
