import { Global, Module } from '@nestjs/common'
import { NestjsQueryTypeOrmModule } from '@nestjs-query/query-typeorm'
import { NestjsQueryGraphQLModule } from '@nestjs-query/query-graphql'

import { NotificationsModule } from '../notifications/notifications.module'
import { PlanEntity } from './entities/plan.entity'
import { PaymentEntity } from './entities/payment.entity'
import { PlansService } from './services/plans.service'
import { PaymentsService } from './services/payments.service'
import { PaymentDTO } from './dto/payment.dto'
import { StripeService } from './services/stripe.service'
import { KillBillService } from './services/killbill.service'
import { ProvidersService } from './services/providers.service'

@Global()
@Module({
  providers: [StripeService, KillBillService, ProvidersService],
  exports: [StripeService, KillBillService, ProvidersService]
})
class PaymentGatewaysModule {}

@Module({
  imports: [
    PaymentGatewaysModule,
    NestjsQueryGraphQLModule.forFeature({
      imports: [NestjsQueryTypeOrmModule.forFeature([PaymentEntity, PlanEntity]), NotificationsModule],
      services: [PlansService, PaymentsService],
      resolvers: [{ DTOClass: PaymentDTO, ServiceClass: PaymentsService }]
    })
  ],
  providers: [PlansService, PaymentsService],
  exports: [PlansService, PaymentsService]
})
export class PaymentsModule {}
