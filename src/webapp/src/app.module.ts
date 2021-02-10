import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { ApiModule } from './api/api.module'
import { AccountsModule } from './accounts/accounts.module'
import { AuthModule } from './auth/auth.module'
import { TypeOrmModule } from '@nestjs/typeorm'
import { GraphQLModule } from '@nestjs/graphql'
import { WebsiteModule } from './website/website.module'
import { NotificationsModule } from './notifications/notifications.module'

import { readFileSync } from 'fs'
import * as yaml from 'js-yaml'
import { join } from 'path'

const getConfig = (): any => yaml.load(
  readFileSync(join(__dirname, '..', 'config', 'saasform.yml'), 'utf8')
)

// We preload configs, so that we can
// directly use them in the @Module setup
const config = getConfig()

// TODO: check is insecure params are being used

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [getConfig],
      isGlobal: true
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: config.MYSQL_HOST ?? 'localhost',
      port: parseInt(config.MYSQL_PORT ?? '3306'),
      username: config.MYSQL_USER ?? 'saasform',
      password: config.MYSQL_PASSWORD ?? 'saasformp',
      database: config.MYSQL_DATABASE ?? 'saasform',
      autoLoadEntities: true,
      synchronize: true, // TODO: remove this once migrations are in place
      extra: {
        min: 0,
        max: 100,
        evictionRunIntervalMillis: 120000,
        idleTimeoutMillis: 120000
      }
    }),
    GraphQLModule.forRoot({
      playground: true,
      installSubscriptionHandlers: true,
      autoSchemaFile: true
    }),
    ApiModule,
    AccountsModule,
    AuthModule,
    WebsiteModule,
    NotificationsModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
