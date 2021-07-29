import { Test, TestingModule } from '@nestjs/testing'
import { Connection } from 'typeorm'
import { NestExpressApplication } from '@nestjs/platform-express'

import * as request from 'supertest'
// import jwt_decode from 'jwt-decode'

import { AppModule } from './app.module'
import { configureApp } from '../src/main.app'
import { StripeService } from '../src/payments/services/stripe.service'
// import { GoogleOAuth2Service } from '../src/auth/google.service'
import { CronService } from '../src/cron/cron.service'

/**
 * User: 101, 102, 103
 * Account: 201 => users 101, 102
 *          211 => user 111
 * Plans: 401, 402, 403
 * Payments: 501 => user 101
 */
const DB_INIT: string = `
TRUNCATE accounts;
TRUNCATE accounts_users;
TRUNCATE users;
TRUNCATE users_credentials;
TRUNCATE plans;
TRUNCATE payments;
TRUNCATE settings;

INSERT INTO settings VALUES (1,'website','{"name": "Uplom", "domain_primary": "uplom.com"}', NOW(), NOW());
INSERT INTO users (id, email, password, isAdmin, isActive, emailConfirmationToken, resetPasswordToken,data, created) VALUES (101,'admin@uplom.com','password',1,1,1,1,'{"profile":{}}', '2021-04-24 13:24:10'),(102,'user@gmail.com','password',0,1,1,'1k-X4PTtCQ7lGQ','{"resetPasswordToken": "1k-X4PTtCQ7lGQ", "resetPasswordTokenExp": "1708940883080", "profile": {}}','2021-04-24 13:24:10'),(111,'nosub@gmail.com','password',0,1,1,1,'{}','2021-04-24 13:24:10');
INSERT INTO accounts (id, owner_id, data) VALUES (201, 101, '{}'),(211, 111, '{}');
INSERT INTO accounts_users (account_id, user_id) VALUES (201, 101),(201, 102),(211, 111);
INSERT INTO users_credentials (credential, userId, json) VALUES ('admin@uplom.com',101,'{"encryptedPassword": "$2b$12$lQHyC/s1tdH1kTwrayYyUOISPteINC5zbHL2eWL6On7fMtIgwYdNm"}');
INSERT INTO users_credentials (credential, userId, json) VALUES ('user@gmail.com',102,'{"encryptedPassword": "$2b$12$lQHyC/s1tdH1kTwrayYyUOISPteINC5zbHL2eWL6On7fMtIgwYdNm"}');
INSERT INTO users_credentials (credential, userId, json) VALUES ('nosub@gmail.com',111,'{"encryptedPassword": "$2b$12$lQHyC/s1tdH1kTwrayYyUOISPteINC5zbHL2eWL6On7fMtIgwYdNm"}');
`

const existingUser = 'email=admin@uplom.com&password=password'
const user = 'email=user@gmail.com&password=password'
const newUser = 'email=newUser@gmail.com&name=newUser'

let agent: any

jest.setTimeout(1000 * 60 * 10)

// const envFile = '../env/env.local'
// const secretsFile = '../env/secrets.local'

describe('Invite user (e2e)', () => {
  let app: NestExpressApplication
  // let settingsService: SettingsService

  const mockedStripe = {
    client2: {},
    client: {
      customers: {
        retrieve: jest.fn(_ => {
          return ({
            subscriptions: {
              data: [
                { id: 'sub_2', status: 'active', active: 'false' },
                { id: 'sub_3', status: 'active', active: 'true' }
              ]
            }
          })
        }),
        create: jest.fn(_ => {
          return ({
          })
        }),
        update: jest.fn(_ => {})
      },
      paymentMethods: {
        attach: jest.fn(_ => {})
      },
      products: {
        create: jest.fn(_ => {})
      },
      prices: {
        create: jest.fn(_ => {})
      }
    }
  }

  const mockedCronService = {
    setupCron: jest.fn(_ => {})
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    })
      .overrideProvider(StripeService).useValue(mockedStripe)
      // .overrideProvider(GoogleOAuth2Service).useValue(mockedGoogle)
      .overrideProvider(CronService).useValue(mockedCronService)
      .compile()

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

  // it('user password change', async () => {
  //   return agent
  //     .post('/api/v1/user/password-change')
  //     .send(passwordChange)
  //     .then(res => {
  //       expect(res.body).toEqual({ message: {}, statusCode: 201 })
  //     })
  // })

  it('should invite a user', done => {
    return agent
      .post('/api/v1/login')
      .send(existingUser)
      .expect(302)
      .then(res => {
        agent
          .post('/api/v1/team/user')
          .set('Cookie', res.header['set-cookie'])
          .send(newUser)
          .then(res => {
            console.log(res.body)
            done()
          })
      })
  })

  it('should return an updated team list', done => {
    return agent
      .post('/api/v1/login')
      .send(user)
      .expect(302)
      .then(res => {
        agent
          .get('/api/v1/team/users')
          .set('Cookie', res.header['set-cookie'])
          .send()
          .then(res => {
            try {
              const actual = res.body.message.map(u => {
                const { email, profile, username } = u
                return { email, profile, username }
              })
              expect(actual).toEqual([{ email: 'admin@uplom.com', profile: {}, username: null }, { email: 'user@gmail.com', profile: {}, username: null }, { email: 'newUser@gmail.com', profile: { email: 'newUser@gmail.com', name: 'newUser' }, username: null }])
              return done()
            } catch (err) {
              console.log('err', err)
              return done(err)
            }
          })
      })
  })

  it('should not invite a user twice', done => {
    return agent
      .post('/api/v1/login')
      .send(existingUser)
      .expect(302)
      .then(res => {
        const cookie = res.header['set-cookie']
        agent
          .post('/api/v1/team/user')
          .set('Cookie', cookie)
          .send(newUser)
          .then(res => {
            agent
              .get('/api/v1/team/users')
              .set('Cookie', cookie)
              .send()
              .then(res => {
                try {
                  console.log('body', res.body)
                  const actual = res.body.message.map(u => {
                    const { email, profile, username } = u
                    return { email, profile, username }
                  })
                  expect(actual).toEqual([{ email: 'admin@uplom.com', profile: {}, username: null }, { email: 'user@gmail.com', profile: {}, username: null }, { email: 'newUser@gmail.com', profile: { email: 'newUser@gmail.com', name: 'newUser' }, username: null }])
                  return done()
                } catch (err) {
                  console.log('err', err)
                  return done(err)
                }
              })
          })
      })
  })
})
