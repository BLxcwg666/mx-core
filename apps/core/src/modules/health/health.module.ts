import { Module } from '@nestjs/common'
import { HealthController } from './health.controller'
import { HealthLogController } from './sub-controller/log.controller'

@Module({
  controllers: [HealthController, HealthLogController],
})
export class HealthModule {}
