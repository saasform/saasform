import { Module } from '@nestjs/common'
import { NestjsQueryGraphQLModule } from '@nestjs-query/query-graphql'
import { NestjsQueryTypeOrmModule } from '@nestjs-query/query-typeorm'
import { SettingsItemDTO } from './settings.dto'
import { SettingsEntity } from './settings.entity'
import { SettingsService } from './settings.service'

@Module({
  imports: [
    NestjsQueryGraphQLModule.forFeature({
      imports: [NestjsQueryTypeOrmModule.forFeature([SettingsEntity])],
      services: [SettingsService],
      resolvers: [{ DTOClass: SettingsItemDTO, ServiceClass: SettingsService }]
    })
  ],
  providers: [SettingsService],
  exports: [SettingsService]
})
export class SettingsModule {}
