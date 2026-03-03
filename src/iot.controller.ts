import { Body, Controller, Post } from '@nestjs/common';

@Controller('iot')
export class IotController {
  @Post('vitals')
  receiveVitals(@Body() payload: unknown) {
    console.log(payload);

    return { message: 'Vitals recibidos' };
  }
}
