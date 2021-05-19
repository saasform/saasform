import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'

import { AppController } from '../src/app.controller'
import { AppService } from '../src/app.service'
import { ApiModule } from '../src/api/api.module'
import { TypeOrmModule } from '@nestjs/typeorm'
import { GraphQLModule } from '@nestjs/graphql'
import { WebsiteModule } from '../src/website/website.module'
import { SettingsModule } from '../src/settings/settings.module'
import { ValidatorModule } from '../src/validator/validator.module'

import { DB_CONFIG } from './config'
const configuration = (): any => ({
  port: 1234
})

@Module({
  imports: [
    TypeOrmModule.forRoot(DB_CONFIG),
    ConfigModule.forRoot({
      // envFilePath: [secretsFile, envFile],
      load: [configuration],
      isGlobal: true
    }),

    GraphQLModule.forRoot({
      playground: true, // TODO: remove this in prod
      installSubscriptionHandlers: true,
      autoSchemaFile: true
    }),
    ValidatorModule,
    SettingsModule,

    ScheduleModule.forRoot(),
    GraphQLModule.forRoot({
      playground: true, // TODO: remove this in prod
      installSubscriptionHandlers: true,
      autoSchemaFile: true
    }),

    ApiModule,
    WebsiteModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
