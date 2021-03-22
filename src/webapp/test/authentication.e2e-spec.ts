import { Test, TestingModule } from '@nestjs/testing'
import { SettingsModule } from '../src/settings/settings.module'
import { TypeOrmModule } from '@nestjs/typeorm'
import { GraphQLModule } from '@nestjs/graphql'
// import { INestApplication } from '@nestjs/common'
import { Connection } from 'typeorm'
import { NestExpressApplication } from '@nestjs/platform-express'
import * as request from 'supertest'
import { ConfigModule } from '@nestjs/config'
// import { ExtractJwt } from 'passport-jwt'

// import { AppModule } from './../src/app.module'
import { DB_CONFIG } from './config'
import { configureApp } from '../src/main.app'
import { AppService } from '../src/app.service'
import { AuthModule } from '../src/auth/auth.module'
import { ValidatorModule } from '../src/validator/validator.module'
import { ApiV1AutheticationController } from '../src/api/controllers/v1/api.authentication.controller'
import { StripeService } from '../src/payments/services/stripe.service'

import jwt_decode from 'jwt-decode'
import { GoogleOAuth2Service } from '../src/auth/google.service'

// const keys = {
//   jwt_private_key: '-----BEGIN PRIVATE KEY-----nMIGEAgEAMBAGByqGSM49AgEGBSuBBAAKBG0wawIBAQQgxjRaB1myLLnts/gMj3sPnwwlnF9BxLF86108qAH4g5zqhRANCAAQfUj/9Q1zJBqw+HX0e37+fHo9BoU4sE6MbnE4yKeEua8pncGu53WWZ6ExJ2Ohnf5gPYRoj3f1z3utCDjADPuFSOn-----END PRIVATE KEY-----n',
//   jwt_public_key: '-----BEGIN PUBLIC KEY-----nMFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAEH1I//UNcyQasPh19Ht+/nx6PQaFOLBOjnGxOMinhLmvKZ3Brud1lmehMSdjoZ3+YD2EaI939c97rQg4wAz7hUjg==n-----END PUBLIC KEY-----n'
// }

/**
 * User: 101, 102, 111
 * Account: 201 => users 101, 102
 *          211 => user 111
 * Plans: 401, 402, 403
 * Payments: 501 => account 201
 *           511 => account 211 INVALID
 */
const DB_INIT: string = `
INSERT INTO settings VALUES (1,'website','{"name": "Uplom", "domain_primary": "uplom.com"}', NOW(), NOW());
INSERT INTO users (id, email, password, isAdmin, isActive, emailConfirmationToken, resetPasswordToken,data) VALUES (101,'admin@uplom.com','password',1,1,1,1,'{"profile":{}}');
INSERT INTO users (id, email, password, isAdmin, isActive, emailConfirmationToken, resetPasswordToken,data) VALUES (102,'user@gmail.com','password',0,1,1,'1k-X4PTtCQ7lGQ','{"resetPasswordToken": "1k-X4PTtCQ7lGQ", "resetPasswordTokenExp": "1708940883080", "profile": {}}');
INSERT INTO users (id, email, password, isAdmin, isActive, emailConfirmationToken, resetPasswordToken,data) VALUES (111,'nosub@gmail.com','password',0,1,1,1,'{}');
INSERT INTO accounts (id, owner_id, data) VALUES (201, 101, '{}');
INSERT INTO accounts (id, owner_id, data) VALUES (211, 111, '{}');
INSERT INTO accounts_users (account_id, user_id) VALUES (201, 101);
INSERT INTO accounts_users (account_id, user_id) VALUES (201, 102);
INSERT INTO accounts_users (account_id, user_id) VALUES (211, 111);
INSERT INTO users_credentials (email, userId, json) VALUES ('admin@uplom.com',101,'{"encryptedPassword": "$2b$12$lQHyC/s1tdH1kTwrayYyUOISPteINC5zbHL2eWL6On7fMtIgwYdNm"}');
INSERT INTO users_credentials (email, userId, json) VALUES ('user@gmail.com',102,'{"encryptedPassword": "$2b$12$lQHyC/s1tdH1kTwrayYyUOISPteINC5zbHL2eWL6On7fMtIgwYdNm"}');
INSERT INTO users_credentials (email, userId, json) VALUES ('nosub@gmail.com',111,'{"encryptedPassword": "$2b$12$lQHyC/s1tdH1kTwrayYyUOISPteINC5zbHL2eWL6On7fMtIgwYdNm"}');
INSERT INTO plans (id,created,updated,product,prices,plan) VALUES (401,NOW(),NOW(),'{"id":"prod_J0MI7GCNSSh3eQ","object":"product","active":true,"attributes":[],"created":1614166256,"description":"Starter plan","images":[],"livemode":false,"metadata":{},"name":"Starter","statement_descriptor":null,"type":"service","unit_label":null,"updated":1614166256}','[{"id":"price_1IOLa0H8nkbB9IbKGSbOahRx","object":"price","active":true,"billing_scheme":"per_unit","created":1614166256,"currency":"usd","livemode":false,"lookup_key":null,"metadata":{},"nickname":null,"product":"prod_J0MI7GCNSSh3eQ","recurring":{"aggregate_usage":null,"interval":"month","interval_count":1,"trial_period_days":null,"usage_type":"licensed"},"tiers_mode":null,"transform_quantity":null,"type":"recurring","unit_amount":3500,"unit_amount_decimal":"3500"},{"id":"price_1IOLa1H8nkbB9IbKR5c7gSfx","object":"price","active":true,"billing_scheme":"per_unit","created":1614166257,"currency":"usd","livemode":false,"lookup_key":null,"metadata":{},"nickname":null,"product":"prod_J0MI7GCNSSh3eQ","recurring":{"aggregate_usage":null,"interval":"year","interval_count":1,"trial_period_days":null,"usage_type":"licensed"},"tiers_mode":null,"transform_quantity":null,"type":"recurring","unit_amount":34800,"unit_amount_decimal":"34800"}]','{"id":"prod_J0MI7GCNSSh3eQ","description":"Starter plan","name":"Starter","features":[{"name":"3 sites"},{"name":"1,000 shares"},{"name":"Email support"}],"button":"Choose","prices":{"month":{"id":"price_1IOLa0H8nkbB9IbKGSbOahRx","unit_amount_decimal":"3500","recurring":{"aggregate_usage":null,"interval":"month","interval_count":1,"trial_period_days":null,"usage_type":"licensed"},"product":"prod_J0MI7GCNSSh3eQ","currency":"usd","unit_amount_hr":35},"year":{"id":"price_1IOLa1H8nkbB9IbKR5c7gSfx","unit_amount_decimal":"34800","recurring":{"aggregate_usage":null,"interval":"year","interval_count":1,"trial_period_days":null,"usage_type":"licensed"},"product":"prod_J0MI7GCNSSh3eQ","currency":"usd","unit_amount_hr":348}}}');
INSERT INTO plans (id,created,updated,product,prices,plan) VALUES (402,NOW(),NOW(),'{"id":"prod_J0MIPuMEZ7pG2O","object":"product","active":true,"attributes":[],"created":1614166257,"description":"Pro plan","images":[],"livemode":false,"metadata":{},"name":"Pro","statement_descriptor":null,"type":"service","unit_label":null,"updated":1614166257}','[{"id":"price_1IOLa1H8nkbB9IbKVCb5iqAE","object":"price","active":true,"billing_scheme":"per_unit","created":1614166257,"currency":"usd","livemode":false,"lookup_key":null,"metadata":{},"nickname":null,"product":"prod_J0MIPuMEZ7pG2O","recurring":{"aggregate_usage":null,"interval":"month","interval_count":1,"trial_period_days":null,"usage_type":"licensed"},"tiers_mode":null,"transform_quantity":null,"type":"recurring","unit_amount":11900,"unit_amount_decimal":"11900"},{"id":"price_1IOLa2H8nkbB9IbKgGNmAyyq","object":"price","active":true,"billing_scheme":"per_unit","created":1614166258,"currency":"usd","livemode":false,"lookup_key":null,"metadata":{},"nickname":null,"product":"prod_J0MIPuMEZ7pG2O","recurring":{"aggregate_usage":null,"interval":"year","interval_count":1,"trial_period_days":null,"usage_type":"licensed"},"tiers_mode":null,"transform_quantity":null,"type":"recurring","unit_amount":118800,"unit_amount_decimal":"118800"}]','{"id":"prod_J0MIPuMEZ7pG2O","description":"Pro plan","name":"Pro","features":[{"name":"100 sites"},{"name":"Unlimited shares"},{"name":"Premium support"}],"button":"Choose","primary":true,"prices":{"month":{"id":"price_1IOLa1H8nkbB9IbKVCb5iqAE","unit_amount_decimal":"11900","recurring":{"aggregate_usage":null,"interval":"month","interval_count":1,"trial_period_days":null,"usage_type":"licensed"},"product":"prod_J0MIPuMEZ7pG2O","currency":"usd","unit_amount_hr":119},"year":{"id":"price_1IOLa2H8nkbB9IbKgGNmAyyq","unit_amount_decimal":"118800","recurring":{"aggregate_usage":null,"interval":"year","interval_count":1,"trial_period_days":null,"usage_type":"licensed"},"product":"prod_J0MIPuMEZ7pG2O","currency":"usd","unit_amount_hr":1188}}}');
INSERT INTO plans (id,created,updated,product,prices,plan) VALUES (403,NOW(),NOW(),'{"id":"prod_J0MIdVcEMSWbe4","object":"product","active":true,"attributes":[],"created":1614166258,"description":"Enterprise plan","images":[],"livemode":false,"metadata":{},"name":"Enterprise","statement_descriptor":null,"type":"service","unit_label":null,"updated":1614166258}','[{"id":"price_1IOLa2H8nkbB9IbKst64IUqB","object":"price","active":true,"billing_scheme":"per_unit","created":1614166258,"currency":"usd","livemode":false,"lookup_key":null,"metadata":{},"nickname":null,"product":"prod_J0MIdVcEMSWbe4","recurring":{"aggregate_usage":null,"interval":"month","interval_count":1,"trial_period_days":null,"usage_type":"licensed"},"tiers_mode":null,"transform_quantity":null,"type":"recurring","unit_amount":0,"unit_amount_decimal":"0"},{"id":"price_1IOLa3H8nkbB9IbKYtfLXSMf","object":"price","active":true,"billing_scheme":"per_unit","created":1614166259,"currency":"usd","livemode":false,"lookup_key":null,"metadata":{},"nickname":null,"product":"prod_J0MIdVcEMSWbe4","recurring":{"aggregate_usage":null,"interval":"year","interval_count":1,"trial_period_days":null,"usage_type":"licensed"},"tiers_mode":null,"transform_quantity":null,"type":"recurring","unit_amount":0,"unit_amount_decimal":"0"}]','{"id":"prod_J0MIdVcEMSWbe4","description":"Enterprise plan","name":"Enterprise","features":[{"name":"All features"},{"name":"Cloud or on-prem"},{"name":"Premium support"}],"button":"Contact us","priceText":"Let talk","prices":{"month":{"id":"price_1IOLa2H8nkbB9IbKst64IUqB","unit_amount_decimal":"0","recurring":{"aggregate_usage":null,"interval":"month","interval_count":1,"trial_period_days":null,"usage_type":"licensed"},"product":"prod_J0MIdVcEMSWbe4","currency":"usd","unit_amount_hr":0},"year":{"id":"price_1IOLa3H8nkbB9IbKYtfLXSMf","unit_amount_decimal":"0","recurring":{"aggregate_usage":null,"interval":"year","interval_count":1,"trial_period_days":null,"usage_type":"licensed"},"product":"prod_J0MIdVcEMSWbe4","currency":"usd","unit_amount_hr":0}}}');
INSERT INTO payments (id,account_id,status,data) VALUES (501,201,'trialing','{"id":"sub_J39ScO2qo7sBUN","object":"subscription","application_fee_percent":null,"billing_cycle_anchor":1614810419,"billing_thresholds":null,"cancel_at":null,"cancel_at_period_end":false,"canceled_at":null,"collection_method":"charge_automatically","created":1614810419,"current_period_end":1646346419,"current_period_start":1614810419,"customer":"cus_J0j38qhPWapRdQ","days_until_due":null,"default_payment_method":"pm_1IR38lH8nkbB9IbKzIVmzuQP","default_source":null,"default_tax_rates":[],"discount":null,"ended_at":null,"items":{"object":"list","data":[{"id":"si_J39ScZoa98hqau","object":"subscription_item","billing_thresholds":null,"created":1614810420,"metadata":{},"plan":{"id":"price_1IOLa2H8nkbB9IbKgGNmAyyq","object":"plan","active":true,"aggregate_usage":null,"amount":118800,"amount_decimal":"118800","billing_scheme":"per_unit","created":1614166258,"currency":"usd","interval":"year","interval_count":1,"livemode":false,"metadata":{},"nickname":null,"product":"prod_J0MIPuMEZ7pG2O","tiers_mode":null,"transform_usage":null,"trial_period_days":null,"usage_type":"licensed"},"price":{"id":"price_1IOLa2H8nkbB9IbKgGNmAyyq","object":"price","active":true,"billing_scheme":"per_unit","created":1614166258,"currency":"usd","livemode":false,"lookup_key":null,"metadata":{},"nickname":null,"product":"prod_J0MIPuMEZ7pG2O","recurring":{"aggregate_usage":null,"interval":"year","interval_count":1,"trial_period_days":null,"usage_type":"licensed"},"tiers_mode":null,"transform_quantity":null,"type":"recurring","unit_amount":118800,"unit_amount_decimal":"118800"},"quantity":1,"subscription":"sub_J39ScO2qo7sBUN","tax_rates":[]}],"has_more":false,"total_count":1,"url":"/v1/subscription_items?subscription=sub_J39ScO2qo7sBUN"},"latest_invoice":"in_1IR39jH8nkbB9IbKFJBNYTGg","livemode":false,"metadata":{},"next_pending_invoice_item_invoice":null,"pause_collection":null,"pending_invoice_item_interval":null,"pending_setup_intent":null,"pending_update":null,"plan":{"id":"price_1IOLa2H8nkbB9IbKgGNmAyyq","object":"plan","active":true,"aggregate_usage":null,"amount":118800,"amount_decimal":"118800","billing_scheme":"per_unit","created":1614166258,"currency":"usd","interval":"year","interval_count":1,"livemode":false,"metadata":{},"nickname":null,"product":"prod_J0MIPuMEZ7pG2O","tiers_mode":null,"transform_usage":null,"trial_period_days":null,"usage_type":"licensed"},"quantity":1,"schedule":null,"start_date":1614810419,"status":"active","transfer_data":null,"trial_end":null,"trial_start":null}');
INSERT INTO payments (id,account_id,status,data) VALUES (511,211,'invalid','{"id":"sub_J39ScO2qo7sBUN","object":"subscription","application_fee_percent":null,"billing_cycle_anchor":1614810419,"billing_thresholds":null,"cancel_at":null,"cancel_at_period_end":false,"canceled_at":null,"collection_method":"charge_automatically","created":1614810419,"current_period_end":1646346419,"current_period_start":1614810419,"customer":"cus_J0j38qhPWapRdQ","days_until_due":null,"default_payment_method":"pm_1IR38lH8nkbB9IbKzIVmzuQP","default_source":null,"default_tax_rates":[],"discount":null,"ended_at":null,"items":{"object":"list","data":[{"id":"si_J39ScZoa98hqau","object":"subscription_item","billing_thresholds":null,"created":1614810420,"metadata":{},"plan":{"id":"price_1IOLa2H8nkbB9IbKgGNmAyyq","object":"plan","active":true,"aggregate_usage":null,"amount":118800,"amount_decimal":"118800","billing_scheme":"per_unit","created":1614166258,"currency":"usd","interval":"year","interval_count":1,"livemode":false,"metadata":{},"nickname":null,"product":"prod_J0MIPuMEZ7pG2O","tiers_mode":null,"transform_usage":null,"trial_period_days":null,"usage_type":"licensed"},"price":{"id":"price_1IOLa2H8nkbB9IbKgGNmAyyq","object":"price","active":true,"billing_scheme":"per_unit","created":1614166258,"currency":"usd","livemode":false,"lookup_key":null,"metadata":{},"nickname":null,"product":"prod_J0MIPuMEZ7pG2O","recurring":{"aggregate_usage":null,"interval":"year","interval_count":1,"trial_period_days":null,"usage_type":"licensed"},"tiers_mode":null,"transform_quantity":null,"type":"recurring","unit_amount":118800,"unit_amount_decimal":"118800"},"quantity":1,"subscription":"sub_J39ScO2qo7sBUN","tax_rates":[]}],"has_more":false,"total_count":1,"url":"/v1/subscription_items?subscription=sub_J39ScO2qo7sBUN"},"latest_invoice":"in_1IR39jH8nkbB9IbKFJBNYTGg","livemode":false,"metadata":{},"next_pending_invoice_item_invoice":null,"pause_collection":null,"pending_invoice_item_interval":null,"pending_setup_intent":null,"pending_update":null,"plan":{"id":"price_1IOLa2H8nkbB9IbKgGNmAyyq","object":"plan","active":true,"aggregate_usage":null,"amount":118800,"amount_decimal":"118800","billing_scheme":"per_unit","created":1614166258,"currency":"usd","interval":"year","interval_count":1,"livemode":false,"metadata":{},"nickname":null,"product":"prod_J0MIPuMEZ7pG2O","tiers_mode":null,"transform_usage":null,"trial_period_days":null,"usage_type":"licensed"},"quantity":1,"schedule":null,"start_date":1614810419,"status":"active","transfer_data":null,"trial_end":null,"trial_start":null}');
`

const existingUser = 'email=admin@uplom.com&password=password'
const notExistingUser = 'email=nobody@uplom.com&password=password'
const wrongPassword = 'email=admin@uplom.com&password=wrongPassword'
const newUser = 'email=new@uplom.com&password=password'
const noSubUser = 'email=nosub@gmail.com&password=password'

const COOKIE = '__session'

let agent: any

jest.setTimeout(1000 * 60 * 10)

const configuration = (): any => ({
  port: 1234
})

// const envFile = '../env/env.local'
// const secretsFile = '../env/secrets.local'

describe('Authentication (e2e)', () => {
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

  const GOOGLE_ID_TOKEN_TO_SIGNIN = "BAMBIIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtWbXJpxrTjMiAlmxHxDvBCO7knjP8xw7/se17BvUvLtaDsPSg7CC6Nh6FYSuLMDOiHNlXJTs43b8bepGAzvhB4kt2SUX//JsysI1wspCSnqblapX";
  const GOOGLE_ID_TOKEN_TO_SIGNUP = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtWbXJpxrTjMiAlmxHxDvBCO7knjP8xw7/se17BvUvLtaDsPSg7CC6Nh6FYSuLMDOiHNlXJTs43b8bepGAzvhB4kt2SUX//JsysI1wspCSnqblapX";
  const GOOGLE_ID_TOKEN_TO_ERROR = "QQER2jANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtWbXJpxrTjMiAlmxHxDvBCO7knjP8xw7/se17BvUvLtaDsPSg7CC6Nh6FYSuLMDOiHNlXJTs43b8bepGAzvhB4kt2SUX//JsysI1wspCSnqblapX";

  const mockedGoogle = {
    getUserPayload: jest.fn((idToken) => {
      let res = {};
      if (idToken === GOOGLE_ID_TOKEN_TO_SIGNIN) {
        res = { email: "user@gmail.com", sub: "21042432312123123" };
      }  
      if (idToken === GOOGLE_ID_TOKEN_TO_SIGNUP) { 
        res = { email: "admin@uplom.com", sub: "21011211912123123" };
      }
      if (idToken === GOOGLE_ID_TOKEN_TO_ERROR) {
        res = { email: "mi@gmail.com", sub: "21011218888823123" };
      }
      return res;
    }),
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(DB_CONFIG),
        GraphQLModule.forRoot({
          playground: true,
          installSubscriptionHandlers: true,
          autoSchemaFile: true
        }),
        ConfigModule.forRoot({
          // envFilePath: [secretsFile, envFile],
          load: [configuration],
          isGlobal: true
        }),
        AuthModule,
        SettingsModule,
        ValidatorModule
      ],
      controllers: [ApiV1AutheticationController],
      providers: [
        AppService,
        {
          provide: StripeService,
          useValue: mockedStripe,
        },
        {
          provide: GoogleOAuth2Service,
          useValue: mockedGoogle,
        },
      ]
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
            email_verified: false,
            id: 101,
            nonce: '',
            staff: true,
            status: 'active',
            subscription_expiration: 1646346419,
            subscription_id: 'sub_J39ScO2qo7sBUN',
            subscription_plan: 402,
            subscription_status: 'trialing',
            user_email: '',
            username: ''
          })

          return true
        } catch (err) {
          expect(err).toBeFalsy()
          console.log('err', err)
          return false
        }
      })
  })

  it('login existing user with an invalid subscription', () => {
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
            username: ''
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

  it('with a registered google credential for a registered user, should signin into saasform', () => {
    return agent
      .post('/api/v1/google-signin')
      .send(`idToken=${GOOGLE_ID_TOKEN_TO_SIGNIN}`)
      .expect(302)
  })

  it('with a not registered google credential for a registered user, should signup into saasform and redirect into saasform', () => {
    return agent
      .post('/api/v1/google-signin')
      .send(`idToken=${GOOGLE_ID_TOKEN_TO_SIGNUP}`)
      .expect(302)
  })

  it('with a not registered google credential for a not registered user, should show an error message', () => {
    return agent
      .post('/api/v1/google-signin')
      .send(`idToken=${GOOGLE_ID_TOKEN_TO_ERROR}`)
      .expect(409, { statusCode:409, message: "Ops! You don't have any account in saasform." })
  })
})
