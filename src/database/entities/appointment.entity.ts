import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DoctorSchedule } from './doctor-schedule.entity';
import { User } from './user.entity';

export enum AppointmentStatus {
  PROGRAMADA = 'programada',
  COMPLETADA = 'completada',
  NO_ASISTIO = 'no_asistio',
}

@Entity({ name: 'appointments' })
export class Appointment {
  @PrimaryColumn('uuid', { default: () => 'gen_random_uuid()' })
  id: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  patientId: string;

  @ManyToOne(() => User, (user) => user.patientAppointments, { nullable: false })
  @JoinColumn({ name: 'patient_id' })
  patient: User;

  @Column({ name: 'doctor_id', type: 'uuid' })
  doctorId: string;

  @ManyToOne(() => User, (user) => user.doctorAppointments, { nullable: false })
  @JoinColumn({ name: 'doctor_id' })
  doctor: User;

  @Column({ name: 'schedule_id', type: 'uuid' })
  scheduleId: string;

  @ManyToOne(() => DoctorSchedule, { nullable: false })
  @JoinColumn({ name: 'schedule_id' })
  schedule: DoctorSchedule;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    enumName: 'appointment_status_enum',
  })
  status: AppointmentStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', default: () => 'now()' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', default: () => 'now()' })
  updatedAt: Date;
}
