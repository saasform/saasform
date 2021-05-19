import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

import { configureApp } from './main.app'
import { saasformReporter, tags } from './utilities/reporting'

import * as fs from 'fs'
import { ExpressAdapter } from '@nestjs/platform-express'
import * as http from 'http'
import * as https from 'https'
import * as express from 'express'

/* eslint-disable */
async function bootstrap () {
  saasformReporter.systemReport(tags, true)
  const app = await NestFactory.create(AppModule)
  configureApp(app);
  await app.listen(7000)
}

async function bootstrapTls () {
  const httpsOptions = {
    key: fs.readFileSync('./secrets/localhost.key'),
    cert: fs.readFileSync('./secrets/localhost.crt'),
  };
  
  const server = express();
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(server),
  );

  configureApp(app);

  await app.init();
  
  http.createServer(server).listen(7000);
  https.createServer(httpsOptions, server).listen(7443);
}

bootstrapTls()
/* eslint-enable */
