import { Body, Controller, Post } from '@nestjs/common';
import { IotGateway } from './iot.gateway';

@Controller('iot')
export class IotController {
  constructor(private readonly iotGateway: IotGateway) {}

  @Post('vitals')
  receiveVitals(@Body() payload: unknown) {
    this.iotGateway.emitVitals(payload);

    return { message: 'Vitals recibidos' };
  }
}
