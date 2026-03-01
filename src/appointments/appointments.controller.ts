import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import type { AuthenticatedRequest } from '../auth/guards/access-token.guard';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @UseGuards(AccessTokenGuard)
  async create(
    @Body() body: CreateAppointmentDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.appointmentsService.create(body, request);
  }
}
