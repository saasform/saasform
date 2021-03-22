import { Global, Module } from '@nestjs/common'
import { ValidationService } from './validation.service'

@Global()
@Module({
  imports: [],
  providers: [ValidationService],
  exports: [ValidationService]
})
export class ValidatorModule {}
