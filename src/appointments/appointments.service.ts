import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthenticatedRequest } from '../auth/guards/access-token.guard';
import { Appointment, AppointmentStatus } from '../database/entities/appointment.entity';
import { DoctorSchedule } from '../database/entities/doctor-schedule.entity';
import { UserRole } from '../database/entities/user.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(private readonly dataSource: DataSource) {}

  async create(input: CreateAppointmentDto, request: AuthenticatedRequest) {
    const authenticatedUser = request.user;

    if (!authenticatedUser || authenticatedUser.role !== UserRole.PATIENT) {
      throw new ForbiddenException({ error: { code: 'ONLY_PATIENT_CAN_BOOK' } });
    }

    if (!input?.doctor_id || !input?.schedule_id) {
      throw new BadRequestException('doctor_id y schedule_id son obligatorios.');
    }

    return this.dataSource.transaction(async (manager) => {
      const scheduleRepo = manager.getRepository(DoctorSchedule);
      const appointmentRepo = manager.getRepository(Appointment);

      const schedule = await scheduleRepo
        .createQueryBuilder('schedule')
        .setLock('pessimistic_write')
        .where('schedule.id = :scheduleId', { scheduleId: input.schedule_id })
        .getOne();

      if (!schedule) {
        throw new HttpException({ error: { code: 'SCHEDULE_NOT_FOUND' } }, HttpStatus.NOT_FOUND);
      }

      if (schedule.doctorId !== input.doctor_id) {
        throw new HttpException({ error: { code: 'INVALID_SCHEDULE' } }, HttpStatus.BAD_REQUEST);
      }

      if (!schedule.available) {
        throw new HttpException({ error: { code: 'SLOT_NOT_AVAILABLE' } }, HttpStatus.CONFLICT);
      }

      const appointment = appointmentRepo.create({
        patientId: authenticatedUser.sub,
        doctorId: input.doctor_id,
        scheduleId: schedule.id,
        status: AppointmentStatus.PROGRAMADA,
      });

      const savedAppointment = await appointmentRepo.save(appointment);
      schedule.available = false;
      await scheduleRepo.save(schedule);

      return {
        appointment: {
          id: savedAppointment.id,
          doctor_id: savedAppointment.doctorId,
          patient_id: savedAppointment.patientId,
          date: schedule.date,
          time: schedule.time.slice(0, 5),
          status: savedAppointment.status,
        },
      };
    });
  }
}
