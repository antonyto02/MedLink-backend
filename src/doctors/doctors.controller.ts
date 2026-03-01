import { Controller, Get } from '@nestjs/common';
import { DoctorListItem, DoctorsService } from './doctors.service';

@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  async findAll(): Promise<DoctorListItem[]> {
    return this.doctorsService.findAll();
  }
}
