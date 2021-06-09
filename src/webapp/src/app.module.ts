import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'

import { readFileSync } from 'fs'
import * as yaml from 'js-yaml'
import { join } from 'path'

import { AppController } from './app.controller'
import { AppService } from './app.service'
import { ApiModule } from './api/api.module'
import { TypeOrmModule } from '@nestjs/typeorm'
import { GraphQLModule } from '@nestjs/graphql'
import { WebsiteModule } from './website/website.module'
import { SettingsModule } from './settings/settings.module'
import { ValidatorModule } from './validator/validator.module'

const configSaasform = (): any => yaml.load(
  readFileSync(join(__dirname, '..', 'config', 'saasform.yml'), 'utf8')
)
const configWebsite = (): any => yaml.load(
  readFileSync(join(__dirname, '..', 'config', 'website.yml'), 'utf8')
)

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configSaasform, configWebsite],
      isGlobal: true
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('TYPEORM_HOST'),
        port: configService.get('TYPEORM_PORT'),
        username: configService.get('TYPEORM_USERNAME'),
        password: configService.get('TYPEORM_PASSWORD'),
        database: configService.get('TYPEORM_DATABASE'),
        autoLoadEntities: true,
        // synchronize: true,
        extra: {
          min: 0,
          max: 100,
          evictionRunIntervalMillis: 120000,
          idleTimeoutMillis: 120000
        }
      }),
      inject: [ConfigService]
    }),
    ValidatorModule,
    SettingsModule,

    ScheduleModule.forRoot(),
    GraphQLModule.forRoot({
      playground: false, // to enable playground, comment out publicController::getStar
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
