import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

import { configureApp } from './main.app'

/* eslint-disable */
async function bootstrap () {
  const app = await NestFactory.create(AppModule)
  configureApp(app);
  await app.listen(7000)
}
bootstrap()
/* eslint-enable */
