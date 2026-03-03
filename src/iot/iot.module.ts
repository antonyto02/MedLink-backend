import { Module } from '@nestjs/common';
import { IotController } from './iot.controller';
import { IotGateway } from './iot.gateway';

@Module({
  controllers: [IotController],
  providers: [IotGateway],
})
export class IotModule {}
