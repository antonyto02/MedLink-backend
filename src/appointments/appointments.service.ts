import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { AuthenticatedRequest } from '../auth/guards/access-token.guard';
import { Appointment, AppointmentStatus } from '../database/entities/appointment.entity';
import { DoctorSchedule } from '../database/entities/doctor-schedule.entity';
import { UserRole } from '../database/entities/user.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';

export interface MyAppointmentItem {
  id: string;
  doctor: string;
  date: string;
  time: string;
  status: AppointmentStatus;
}

export interface DoctorAppointmentItem {
  id: string;
  patient: string;
  date: string;
  time: string;
  status: AppointmentStatus;
}

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

  async getMyAppointments(request: AuthenticatedRequest): Promise<MyAppointmentItem[]> {
    const authenticatedUser = request.user;

    if (!authenticatedUser) {
      throw new HttpException({ error: { code: 'UNAUTHORIZED' } }, HttpStatus.UNAUTHORIZED);
    }

    if (authenticatedUser.role !== UserRole.PATIENT) {
      return [];
    }

    const rows = await this.dataSource
      .getRepository(Appointment)
      .createQueryBuilder('appointment')
      .innerJoin('appointment.doctor', 'doctor')
      .innerJoin('appointment.schedule', 'schedule')
      .where('appointment.patient_id = :patientId', { patientId: authenticatedUser.sub })
      .select('appointment.id', 'id')
      .addSelect('doctor.name', 'doctor')
      .addSelect('schedule.date', 'date')
      .addSelect('schedule.time', 'time')
      .addSelect('appointment.status', 'status')
      .orderBy('schedule.date', 'DESC')
      .addOrderBy('schedule.time', 'DESC')
      .getRawMany<{
        id: string;
        doctor: string;
        date: string;
        time: string;
        status: AppointmentStatus;
      }>();

    return rows.map((row) => ({
      id: row.id,
      doctor: row.doctor,
      date: row.date,
      time: row.time.slice(0, 5),
      status: row.status,
    }));
  }

  async getDoctorAppointments(request: AuthenticatedRequest): Promise<DoctorAppointmentItem[]> {
    const authenticatedUser = request.user;

    if (!authenticatedUser) {
      throw new HttpException({ error: { code: 'UNAUTHORIZED' } }, HttpStatus.UNAUTHORIZED);
    }

    if (authenticatedUser.role !== UserRole.DOCTOR) {
      throw new HttpException({ error: { code: 'ONLY_DOCTOR_ALLOWED' } }, HttpStatus.FORBIDDEN);
    }

    const rows = await this.dataSource
      .getRepository(Appointment)
      .createQueryBuilder('appointment')
      .innerJoin('appointment.patient', 'patient')
      .innerJoin('appointment.schedule', 'schedule')
      .where('appointment.doctor_id = :doctorId', { doctorId: authenticatedUser.sub })
      .select('appointment.id', 'id')
      .addSelect('patient.name', 'patient')
      .addSelect('schedule.date', 'date')
      .addSelect('schedule.time', 'time')
      .addSelect('appointment.status', 'status')
      .orderBy('schedule.date', 'DESC')
      .addOrderBy('schedule.time', 'DESC')
      .getRawMany<{
        id: string;
        patient: string;
        date: string;
        time: string;
        status: AppointmentStatus;
      }>();

    return rows.map((row) => ({
      id: row.id,
      patient: row.patient,
      date: row.date,
      time: row.time.slice(0, 5),
      status: row.status,
    }));
  }

  async updateStatus(
    appointmentId: string,
    input: UpdateAppointmentStatusDto,
    request: AuthenticatedRequest,
  ): Promise<{ appointment: { id: string; status: AppointmentStatus } }> {
    const authenticatedUser = request.user;

    if (!authenticatedUser) {
      throw new HttpException({ error: { code: 'UNAUTHORIZED' } }, HttpStatus.UNAUTHORIZED);
    }

    if (authenticatedUser.role !== UserRole.DOCTOR) {
      throw new HttpException({ error: { code: 'ONLY_DOCTOR_ALLOWED' } }, HttpStatus.FORBIDDEN);
    }

    if (
      input?.status !== AppointmentStatus.COMPLETADA &&
      input?.status !== AppointmentStatus.NO_ASISTIO
    ) {
      throw new HttpException({ error: { code: 'INVALID_STATUS' } }, HttpStatus.UNPROCESSABLE_ENTITY);
    }

    const appointmentRepo = this.dataSource.getRepository(Appointment);
    const appointment = await appointmentRepo.findOne({
      where: { id: appointmentId, doctorId: authenticatedUser.sub },
      select: { id: true, status: true },
    });

    if (!appointment) {
      throw new HttpException({ error: { code: 'APPOINTMENT_NOT_FOUND' } }, HttpStatus.NOT_FOUND);
    }

    if (appointment.status !== AppointmentStatus.PROGRAMADA) {
      throw new HttpException(
        { error: { code: 'APPOINTMENT_ALREADY_CLOSED' } },
        HttpStatus.CONFLICT,
      );
    }

    appointment.status = input.status as AppointmentStatus;
    const updated = await appointmentRepo.save(appointment);

    return {
      appointment: {
        id: updated.id,
        status: updated.status,
      },
    };
  }

}
