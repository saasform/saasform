import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { ApiModule } from './api/api.module'
import { AccountsModule } from './accounts/accounts.module'
import { AuthModule } from './auth/auth.module'
import { TypeOrmModule } from '@nestjs/typeorm'
import { GraphQLModule } from '@nestjs/graphql'

const envFile = './env/env.local'
/* eslint @typescript-eslint/no-var-requires: "off" */
require('dotenv').config({ path: envFile })

@Module({
  imports: [
    ApiModule,
    AccountsModule,
    AuthModule,
    ConfigModule.forRoot({
      envFilePath: [envFile]
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
    })
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
