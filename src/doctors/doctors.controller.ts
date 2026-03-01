import { Controller, Get, Param, Query } from '@nestjs/common';
import { DoctorListItem, DoctorScheduleResponse, DoctorsService } from './doctors.service';

@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  async findAll(): Promise<DoctorListItem[]> {
    return this.doctorsService.findAll();
  }

  @Get(':id/schedule')
  async findAvailableSchedule(
    @Param('id') id: string,
    @Query('date') date?: string,
  ): Promise<DoctorScheduleResponse> {
    return this.doctorsService.findAvailableSchedule(id, date);
  }
}
