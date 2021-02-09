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

import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { join } from 'path';

const config = () => yaml.load(
  readFileSync(join(__dirname, '..', 'config', 'saasform.yml'), 'utf8'),
);

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [config],
      isGlobal: true
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.MYSQL_HOST ?? 'localhost',
      port: parseInt(process.env.MYSQL_PORT ?? '3306'),
      username: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      autoLoadEntities: true, // TODO: remove this once migrations are in place
      synchronize: true,
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
