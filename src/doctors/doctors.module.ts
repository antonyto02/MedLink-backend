import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorSchedule } from '../database/entities/doctor-schedule.entity';
import { User } from '../database/entities/user.entity';
import { DoctorsController } from './doctors.controller';
import { DoctorsService } from './doctors.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, DoctorSchedule])],
  controllers: [DoctorsController],
  providers: [DoctorsService],
})
export class DoctorsModule {}
