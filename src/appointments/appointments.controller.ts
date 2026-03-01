import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import type { AuthenticatedRequest } from '../auth/guards/access-token.guard';
import {
  AppointmentsService,
  DoctorAppointmentItem,
  MyAppointmentItem,
} from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';

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

  @Get('me')
  @UseGuards(AccessTokenGuard)
  async getMyAppointments(@Req() request: AuthenticatedRequest): Promise<MyAppointmentItem[]> {
    return this.appointmentsService.getMyAppointments(request);
  }

  @Get('doctor')
  @UseGuards(AccessTokenGuard)
  async getDoctorAppointments(
    @Req() request: AuthenticatedRequest,
  ): Promise<DoctorAppointmentItem[]> {
    return this.appointmentsService.getDoctorAppointments(request);
  }

  @Patch(':id/status')
  @UseGuards(AccessTokenGuard)
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateAppointmentStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.appointmentsService.updateStatus(id, body, request);
  }

}
