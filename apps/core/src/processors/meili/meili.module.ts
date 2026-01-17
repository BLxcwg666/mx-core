import { Global, Module } from '@nestjs/common'
import { MeiliSearchService } from './meili.service'

@Global()
@Module({
  providers: [MeiliSearchService],
  exports: [MeiliSearchService],
})
export class MeiliSearchModule {}
