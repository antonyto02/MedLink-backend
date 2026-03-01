import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { DoctorSchedule } from '../database/entities/doctor-schedule.entity';
import { User, UserRole } from '../database/entities/user.entity';

export interface DoctorListItem {
  id: string;
  name: string;
}

export interface DoctorScheduleResponse {
  date: string;
  slots: Array<{
    schedule_id: string;
    time: string;
  }>;
}

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(DoctorSchedule)
    private readonly doctorScheduleRepository: Repository<DoctorSchedule>,
  ) {}

  async findAll(): Promise<DoctorListItem[]> {
    return this.usersRepository.find({
      where: { role: UserRole.DOCTOR, deletedAt: IsNull() },
      select: { id: true, name: true },
      order: { name: 'ASC' },
    });
  }

  async findAvailableSchedule(doctorId: string, date?: string): Promise<DoctorScheduleResponse> {
    if (!date || !this.isValidDate(date)) {
      throw new HttpException({ error: { code: 'DATE_REQUIRED' } }, HttpStatus.BAD_REQUEST);
    }

    const doctor = await this.usersRepository.findOne({
      where: { id: doctorId, role: UserRole.DOCTOR, deletedAt: IsNull() },
      select: { id: true },
    });

    if (!doctor) {
      throw new HttpException({ error: { code: 'DOCTOR_NOT_FOUND' } }, HttpStatus.NOT_FOUND);
    }

    const schedules = await this.doctorScheduleRepository.find({
      where: { doctorId, date, available: true },
      select: { id: true, time: true },
      order: { time: 'ASC' },
    });

    return {
      date,
      slots: schedules.map((schedule) => ({
        schedule_id: schedule.id,
        time: schedule.time.slice(0, 5),
      })),
    };
  }

  private isValidDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }

    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      return false;
    }

    return date.toISOString().slice(0, 10) === value;
  }
}
