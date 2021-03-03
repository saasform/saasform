import { Global, Module } from '@nestjs/common'
import { NestjsQueryTypeOrmModule } from '@nestjs-query/query-typeorm'
import { NestjsQueryGraphQLModule } from '@nestjs-query/query-graphql'

import { NotificationsModule } from '../notifications/notifications.module'
import { NotificationsService } from '../notifications/notifications.service'
import { PlanEntity } from './entities/plan.entity'
import { PaymentEntity } from './entities/payment.entity'
import { PlansService } from './services/plans.service'
import { PaymentsService } from './services/payments.service'
import { PaymentDTO } from './dto/payment.dto'
import { StripeService } from './services/stripe.service'
import { KillBillService } from './services/killbill.service'

@Global()
@Module({
  imports: [
    NestjsQueryGraphQLModule.forFeature({
      imports: [NestjsQueryTypeOrmModule.forFeature([PaymentEntity, PlanEntity]), NotificationsModule],
      services: [PlansService, PaymentsService, StripeService, KillBillService, NotificationsService],
      resolvers: [{ DTOClass: PaymentDTO, ServiceClass: PaymentsService }]
    })
  ],
  providers: [PlansService, PaymentsService, StripeService, KillBillService],
  exports: [PlansService, PaymentsService, StripeService, KillBillService]
})
export class PaymentsModule {

}
