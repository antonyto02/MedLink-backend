import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';

@Module({
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AccessTokenGuard],
})
export class AppointmentsModule {}
