import { TypeOrmModuleOptions } from '@nestjs/typeorm'

export const DB_CONFIG: TypeOrmModuleOptions = {
  type: 'mysql',
  dropSchema: true,
  host: 'localhost',
  port: 3306,
  username: 'rw',
  password: 'RTMP7smoOuHF2F5+v9IYtTb0KBqq2kIFlbfBla3nAZ3z',
  database: 'db_test',
  autoLoadEntities: true,
  synchronize: true
}
