import { Test, TestingModule } from '@nestjs/testing'
import { SettingsModule } from '../src/settings/settings.module'
import { TypeOrmModule } from '@nestjs/typeorm'
import { GraphQLModule } from '@nestjs/graphql'
// import { INestApplication } from '@nestjs/common'
import { Connection } from 'typeorm'
import { NestExpressApplication } from '@nestjs/platform-express'
import * as request from 'supertest'

// import { AppModule } from './../src/app.module'
import { DB_CONFIG } from './config'
import { configureApp } from '../src/main.app'
import { AppService } from '../src/app.service'
import { AuthModule } from '../src/auth/auth.module'
import { ApiV1AutheticationController } from '../src/api/controllers/v1/api.authentication.controller'

/**
 * User: 101, 102, 103
 * Account: 201 => users 101, 102
 *          211 => user 111
 */
const DB_INIT: string = `
INSERT INTO settings VALUES (1,'website','{"name": "Uplom", "domain_primary": "uplom.com"}', NOW(), NOW());
INSERT INTO users (id, email, password, isAdmin, isActive, emailConfirmationToken, resetPasswordToken,data) VALUES (101,'admin@uplom.com','password',1,1,1,1,'{}'),(102,'user@gmail.com','password',0,1,1,'1k-X4PTtCQ7lGQ','{"resetPasswordToken": "1k-X4PTtCQ7lGQ", "resetPasswordTokenExp": "1708940883080"}'),(111,'nosub@gmail.com','password',0,1,1,1,'{}');
INSERT INTO accounts (id, owner_id, data) VALUES (201, 101, ''),(211, 111, '');
INSERT INTO accountsUsers (account_id, user_id) VALUES (201, 101),(201, 102),(211, 111);
INSERT INTO usersCredentials (credential, userId, json) VALUES ('admin@uplom.com',101,'{"encryptedPassword": "$2b$12$lQHyC/s1tdH1kTwrayYyUOISPteINC5zbHL2eWL6On7fMtIgwYdNm"}'),('user@gmail.com',102,'{"encryptedPassword": "$2b$12$lQHyC/s1tdH1kTwrayYyUOISPteINC5zbHL2eWL6On7fMtIgwYdNm"}'),('nosub@gmail.com',111,'{"encryptedPassword": "$2b$12$lQHyC/s1tdH1kTwrayYyUOISPteINC5zbHL2eWL6On7fMtIgwYdNm"}');
`

const existingUser = 'email=admin@uplom.com&password=password'
const notExistingUser = 'email=nobody@uplom.com&password=password'
const wrongPassword = 'email=admin@uplom.com&password=wrongPassword'
const newUser = 'email=new@uplom.com&password=password'

let agent: any

jest.setTimeout(1000 * 60 * 10)

describe('Authentication (e2e)', () => {
  let app: NestExpressApplication

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(DB_CONFIG),
        GraphQLModule.forRoot({
          playground: true,
          installSubscriptionHandlers: true,
          autoSchemaFile: true
        }),
        AuthModule,
        SettingsModule
      ],
      controllers: [ApiV1AutheticationController],
      providers: [AppService]
    }).compile()

    app = moduleFixture.createNestApplication()
    configureApp(app, true)
    await app.init()

    const db = app.get(Connection)
    let query: string
    for (query of DB_INIT.split(';')) {
      if (query.trim() !== '') {
        await db.query(query)
      }
    }

    agent = await request(app.getHttpServer())
  })

  afterAll(async () => {
    await app.close()
  })

  it('login existing user', () => {
    return agent
      .post('/api/v1/login')
      .send(existingUser)
      .expect(201)
  })

  it('login not existing user', () => {
    return agent
      .post('/api/v1/login')
      .send(notExistingUser)
      .expect(401)
  })

  it('login not existing user', () => {
    return agent
      .post('/api/v1/login')
      .send(wrongPassword)
      .expect(401)
  })

  it('register new user', () => {
    return agent
      .post('/api/v1/login')
      .send(newUser)
      .expect(401)
      .then(_ =>
        agent
          .post('/api/v1/signup')
          .send(newUser)
          .expect(302)
          .then(_ =>
            agent
              .post('/api/v1/login')
              .send(newUser)
              .expect(201)
          )
      )
  })

  it('register existing user', () => {
    return agent
      .post('/api/v1/signup')
      .send(existingUser)
      .expect(409)
  })
})
