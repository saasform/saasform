import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

import { configureApp } from './main.app'
import { saasformReporter, tags } from './utilities/reporting'

/* eslint-disable */
async function bootstrap () {
  saasformReporter.systemReport(tags, true)
  const app = await NestFactory.create(AppModule)
  configureApp(app);
  await app.listen(7000)
}
bootstrap()
/* eslint-enable */
