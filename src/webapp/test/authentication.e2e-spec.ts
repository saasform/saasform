import { Test, TestingModule } from '@nestjs/testing'
import { Connection } from 'typeorm'
import { NestExpressApplication } from '@nestjs/platform-express'

import * as request from 'supertest'
import jwt_decode from 'jwt-decode'

import { AppModule } from './app.module'
import { configureApp } from '../src/main.app'
import { GoogleOAuth2Service } from '../src/auth/google.service'
import { CronService } from '../src/cron/cron.service'

import { Stripe } from 'stripe'
jest.mock('stripe')

/**
 * User: 101, 102, 111
 * Account: 201 => users 101, 102
 *          211 => user 111
 * Plans: 401, 402, 403
 * Payments: 501 => account 201
 *           511 => account 211 INVALID
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
INSERT INTO users (id, email, password, isAdmin, isActive, emailConfirmationToken, resetPasswordToken,data) VALUES (101,'admin@uplom.com','password',1,1,1,1,'{"profile":{}, "emailConfirmed": true}');
INSERT INTO users (id, email, password, isAdmin, isActive, emailConfirmationToken, resetPasswordToken,data) VALUES (102,'user@gmail.com','password',0,1,1,'1k-X4PTtCQ7lGQ','{"resetPasswordToken": "1k-X4PTtCQ7lGQ", "resetPasswordTokenExp": "1708940883080", "emailConfirmed": true, "profile": {}}');
INSERT INTO users (id, email, password, isAdmin, isActive, emailConfirmationToken, resetPasswordToken,data) VALUES (103,'user+unverified@gmail.com','password',0,1,1,'1k-X4PTtCQ7lGQ','{"resetPasswordToken": "1k-X4PTtCQ7lGQ", "resetPasswordTokenExp": "1708940883080", "emailConfirmed": false, "profile": {}}');
INSERT INTO users (id, email, password, isAdmin, isActive, emailConfirmationToken, resetPasswordToken,data) VALUES (104,'user+verified@gmail.com','password',0,1,1,'1k-X4PTtCQ7lGQ','{"resetPasswordToken": "1k-X4PTtCQ7lGQ", "resetPasswordTokenExp": "1708940883080", "emailConfirmed": true, "profile": {}}');
INSERT INTO users (id, email, password, isAdmin, isActive, emailConfirmationToken, resetPasswordToken,data) VALUES (111,'nosub@gmail.com','password',0,1,1,1,'{}');
INSERT INTO accounts (id, owner_id, data) VALUES (201, 101, '{"payment": {"plan": {"name": "Pro"}, "sub": {"id":"sub_J39ScO2qo7sBUN","object":"subscription","application_fee_percent":null,"billing_cycle_anchor":1614810419,"billing_thresholds":null,"cancel_at":null,"cancel_at_period_end":false,"canceled_at":null,"collection_method":"charge_automatically","created":1614810419,"current_period_end":1646346419,"current_period_start":1614810419,"customer":"cus_J0j38qhPWapRdQ","days_until_due":null,"default_payment_method":"pm_1IR38lH8nkbB9IbKzIVmzuQP","default_source":null,"default_tax_rates":[],"discount":null,"ended_at":null,"items":{"object":"list","data":[{"id":"si_J39ScZoa98hqau","object":"subscription_item","billing_thresholds":null,"created":1614810420,"metadata":{},"plan":{"id":"price_1IOLa2H8nkbB9IbKgGNmAyyq","object":"plan","active":true,"aggregate_usage":null,"amount":118800,"amount_decimal":"118800","billing_scheme":"per_unit","created":1614166258,"currency":"usd","interval":"year","interval_count":1,"livemode":false,"metadata":{},"nickname":null,"product":"prod_J0MIPuMEZ7pG2O","tiers_mode":null,"transform_usage":null,"trial_period_days":null,"usage_type":"licensed"},"price":{"id":"price_1IOLa2H8nkbB9IbKgGNmAyyq","object":"price","active":true,"billing_scheme":"per_unit","created":1614166258,"currency":"usd","livemode":false,"lookup_key":null,"metadata":{},"nickname":null,"product":"prod_J0MIPuMEZ7pG2O","recurring":{"aggregate_usage":null,"interval":"year","interval_count":1,"trial_period_days":null,"usage_type":"licensed"},"tiers_mode":null,"transform_quantity":null,"type":"recurring","unit_amount":118800,"unit_amount_decimal":"118800"},"quantity":1,"subscription":"sub_J39ScO2qo7sBUN","tax_rates":[]}],"has_more":false,"total_count":1,"url":"/v1/subscription_items?subscription=sub_J39ScO2qo7sBUN"},"latest_invoice":"in_1IR39jH8nkbB9IbKFJBNYTGg","livemode":false,"metadata":{},"next_pending_invoice_item_invoice":null,"pause_collection":null,"pending_invoice_item_interval":null,"pending_setup_intent":null,"pending_update":null,"plan":{"id":"price_1IOLa2H8nkbB9IbKgGNmAyyq","object":"plan","active":true,"aggregate_usage":null,"amount":118800,"amount_decimal":"118800","billing_scheme":"per_unit","created":1614166258,"currency":"usd","interval":"year","interval_count":1,"livemode":false,"metadata":{},"nickname":null,"product":"prod_J0MIPuMEZ7pG2O","tiers_mode":null,"transform_usage":null,"trial_period_days":null,"usage_type":"licensed"},"quantity":1,"schedule":null,"start_date":1614810419,"status":"trialing","transfer_data":null,"trial_end":null,"trial_start":null}}}');
INSERT INTO accounts (id, owner_id, data) VALUES (211, 111, '{}');
INSERT INTO accounts_users (account_id, user_id) VALUES (201, 101);
INSERT INTO accounts_users (account_id, user_id) VALUES (201, 102);
INSERT INTO accounts_users (account_id, user_id) VALUES (211, 111);
INSERT INTO users_credentials (credential, userId, json) VALUES ('admin@uplom.com',101,'{"encryptedPassword": "$2b$12$lQHyC/s1tdH1kTwrayYyUOISPteINC5zbHL2eWL6On7fMtIgwYdNm"}');
INSERT INTO users_credentials (credential, userId, json) VALUES ('user@gmail.com',102,'{"encryptedPassword": "$2b$12$lQHyC/s1tdH1kTwrayYyUOISPteINC5zbHL2eWL6On7fMtIgwYdNm"}');
INSERT INTO users_credentials (credential, userId, json) VALUES ('user+unverified@gmail.com',103,'{"encryptedPassword": "$2b$12$lQHyC/s1tdH1kTwrayYyUOISPteINC5zbHL2eWL6On7fMtIgwYdNm"}');
INSERT INTO users_credentials (credential, userId, json) VALUES ('user+verified@gmail.com',104,'{"encryptedPassword": "$2b$12$lQHyC/s1tdH1kTwrayYyUOISPteINC5zbHL2eWL6On7fMtIgwYdNm"}');
INSERT INTO users_credentials (credential, userId, json) VALUES ('nosub@gmail.com',111,'{"encryptedPassword": "$2b$12$lQHyC/s1tdH1kTwrayYyUOISPteINC5zbHL2eWL6On7fMtIgwYdNm"}');
`

const existingUser = 'email=admin@uplom.com&password=password'
const notExistingUser = 'email=nobody@uplom.com&password=password'
const wrongPassword = 'email=admin@uplom.com&password=wrongPassword'
const newUser = 'email=new@uplom.com&password=password'
const noSubUser = 'email=nosub@gmail.com&password=password'

const COOKIE = '__session'

let agent: any

jest.setTimeout(1000 * 60 * 10)

// const envFile = '../env/env.local'
// const secretsFile = '../env/secrets.local'

describe('Authentication (e2e)', () => {
  let app: NestExpressApplication
  // let settingsService: SettingsService

  const mockedStripe = {
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
    },
    subscriptions: {
      create: jest.fn(_ => {})
    }
  };

  (Stripe as any).mockImplementation(() => {
    return mockedStripe
  })

  const GOOGLE_ID_TOKEN_TO_SIGNIN = 'BAMBIIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtWbXJpxrTjMiAlmxHxDvBCO7knjP8xw7/se17BvUvLtaDsPSg7CC6Nh6FYSuLMDOiHNlXJTs43b8bepGAzvhB4kt2SUX//JsysI1wspCSnqblapX'
  const GOOGLE_ID_TOKEN_TO_SIGNUP = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtWbXJpxrTjMiAlmxHxDvBCO7knjP8xw7/se17BvUvLtaDsPSg7CC6Nh6FYSuLMDOiHNlXJTs43b8bepGAzvhB4kt2SUX//JsysI1wspCSnqblapX'
  const GOOGLE_ID_TOKEN_TO_ERROR = 'QQER2jANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtWbXJpxrTjMiAlmxHxDvBCO7knjP8xw7/se17BvUvLtaDsPSg7CC6Nh6FYSuLMDOiHNlXJTs43b8bepGAzvhB4kt2SUX//JsysI1wspCSnqblapX'
  const GOOGLE_ID_TOKEN_TO_UNVERIFIED = 'UNVER2jANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtWbXJpxrTjMiAlmxHxDvBCO7knjP8xw7/se17BvUvLtaDsPSg7CC6Nh6FYSuLMDOiHNlXJTs43b8bepGAzvhB4kt2SUX//JsysI1wspCSnqblapX'
  const GOOGLE_ID_TOKEN_UNVERIFIED_ON_GOOGLE = 'UNVERG2jANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtWbXJpxrTjMiAlmxHxDvBCO7knjP8xw7/se17BvUvLtaDsPSg7CC6Nh6FYSuLMDOiHNlXJTs43b8bepGAzvhB4kt2SUX//JsysI1wspCSnqblapX'

  const mockedGoogle = {
    getUserPayload: jest.fn((token) => {
      let res = {}
      if (token === GOOGLE_ID_TOKEN_TO_SIGNIN) {
        res = { email: 'user@gmail.com', email_verified: true, sub: '21042432312123123' }
      }
      if (token === GOOGLE_ID_TOKEN_TO_UNVERIFIED) {
        res = { email: 'user+unverified@gmail.com', email_verified: true, sub: '21042432312123124' }
      }
      if (token === GOOGLE_ID_TOKEN_UNVERIFIED_ON_GOOGLE) {
        res = { email: 'user+verified@gmail.com', email_verified: false, sub: '21042432312123125' }
      }
      if (token === GOOGLE_ID_TOKEN_TO_SIGNUP) {
        res = { email: 'admin@uplom.com', email_verified: true, sub: '21011211912123126' }
      }
      if (token === GOOGLE_ID_TOKEN_TO_ERROR) {
        res = { email: 'mi@gmail.com', sub: '21011218888823127' }
      }
      return res
    }),
    getRefreshToken: jest.fn().mockReturnValue({ refresh_token: '' })
  }

  const mockedCronService = {
    setupCron: jest.fn(_ => {})
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    })
      .overrideProvider(GoogleOAuth2Service).useValue(mockedGoogle)
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

  it('login existing user with a subscription', () => {
    return agent
      .post('/api/v1/login')
      .send(existingUser)
      .expect(302)
      .expect(res => {
        const header = res.headers['set-cookie'][0]
          .split('=')

        const cookie = header[0]
        const jwt = header[1].split(' ')[0]

        expect(cookie).toBe(COOKIE)
        expect(res.body).toEqual({ message: 'Found', redirect: 'https://app.uplom.com', statusCode: 302 })

        try {
          const { iat, ...decoded }: any = jwt_decode(jwt)
          expect(decoded).toEqual({
            account_id: 201,
            account_name: '',
            email: 'admin@uplom.com',
            email_verified: true,
            id: 101,
            nonce: '',
            staff: true,
            status: 'active',
            subs_exp: 1646346419,
            subs_name: 'Pro',
            subs_status: 'trialing',
            user_name: '',
            username: null
          })

          return true
        } catch (err) {
          expect(err).toBeFalsy()
          console.log('err', err)
          return false
        }
      })
  })

  it.skip('login existing user with an invalid subscription', () => {
    return agent
      .post('/api/v1/login')
      .send(noSubUser)
      .expect(302)
      .expect(res => {
        const header = res.headers['set-cookie'][0]
          .split('=')

        const cookie = header[0]
        const jwt = header[1].split(' ')[0]

        expect(cookie).toBe(COOKIE)
        expect(res.body).toEqual({ message: 'Found', redirect: '/user/billing', statusCode: 302 })

        try {
          const { iat, ...decoded }: any = jwt_decode(jwt)
          expect(decoded).toEqual({
            account_id: 211,
            account_name: '',
            email: 'nosub@gmail.com',
            email_verified: false,
            id: 111,
            nonce: '',
            staff: false,
            status: 'active',
            username: null
          })

          return true
        } catch (err) {
          expect(err).toBeFalsy()
          console.log('err', err)
          return false
        }
      })
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
              .expect(302)
              .expect(res => {
                const jwt = res.headers['set-cookie'][0]
                  .split('=')[1]
                  .split(' ')[0]
                try {
                  const decoded: any = jwt_decode(jwt)

                  expect(decoded.id).toBe(112)
                  expect(decoded.account_id).toBe(212)
                  expect(decoded.account_name).toBe('new@uplom.com')
                  expect(decoded.status).toBe('active')
                  expect(decoded.email).toBe('new@uplom.com')
                  expect(decoded.email_verified).toBe(false)
                  expect(decoded.staff).toBe(false)
                } catch (err) {
                  console.log('err', err)
                  return false
                }
              })
          )
      )
  })

  it('register existing user', () => {
    return agent
      .post('/api/v1/signup')
      .send(existingUser)
      .expect(409)
  })

  it('with a registered google credential for a registered user, should signin into saasform IF email is verified', () => {
    return agent
      .post('/api/v1/google-signin')
      .send(`id_token=${GOOGLE_ID_TOKEN_TO_SIGNIN}`)
      .expect(302, '{"statusCode":302,"message":"Found","redirect":"https://app.uplom.com"}')
  })

  it('with a registered google credential for a registered user, should NOT signin into saasform IF saasform email unverified', () => {
    return agent
      .post('/api/v1/google-signin')
      .send(`id_token=${GOOGLE_ID_TOKEN_TO_UNVERIFIED}`)
      .expect(409)
  })

  it('with a registered google credential for a registered user, should NOT signin into saasform IF google email unverified', () => {
    return agent
      .post('/api/v1/google-signin')
      .send(`id_token=${GOOGLE_ID_TOKEN_UNVERIFIED_ON_GOOGLE}`)
      .expect(409)
  })

  it('with a not registered google credential for a registered user, should signup into saasform and redirect into saasform', () => {
    return agent
      .post('/api/v1/google-signin')
      .send(`id_token=${GOOGLE_ID_TOKEN_TO_SIGNUP}`)
      .expect(302, '{"statusCode":302,"message":"Found","redirect":"https://app.uplom.com"}')
  })

  it('with a not registered google credential for a not registered user, should signup into saasform and redirect into saasform', () => {
    return agent
      .post('/api/v1/google-signin')
      .send(`id_token=${GOOGLE_ID_TOKEN_TO_ERROR}`)
      .expect(302, '{"statusCode":302,"message":"Found","redirect":"https://app.uplom.com"}')
  })
})
