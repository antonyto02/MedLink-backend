import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DoctorSchedule } from '../database/entities/doctor-schedule.entity';
import { User } from '../database/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, DoctorSchedule])],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
