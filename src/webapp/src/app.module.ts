import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { ApiModule } from './api/api.module'
import { AccountsModule } from './accounts/accounts.module'
import { AuthModule } from './auth/auth.module'
import { TypeOrmModule } from '@nestjs/typeorm'
import { GraphQLModule } from '@nestjs/graphql'

@Module({
  imports: [
    ApiModule,
    AccountsModule,
    AuthModule,
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.MYSQL_HOST,
      port: 3306,
      username: 'rw',
      password: 'RTMP7smoOuHF2F5+v9IYtTb0KBqq2kIFlbfBla3nAZ3z',
      database: 'db0',
      autoLoadEntities: true,
      synchronize: true,
      // entities: [path.join(__dirname, "**/*.entity{.ts,.js}")],
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
