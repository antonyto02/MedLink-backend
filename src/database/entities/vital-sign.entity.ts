import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'vital_signs' })
export class VitalSign {
  @PrimaryColumn('uuid', { default: () => 'gen_random_uuid()' })
  id: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  patientId: string;

  @ManyToOne(() => User, (user) => user.vitalSigns, { nullable: false })
  @JoinColumn({ name: 'patient_id' })
  patient: User;

  @Column({ type: 'integer' })
  bpm: number;

  @Column({ type: 'integer' })
  spo2: number;

  @Column({ name: 'pressure_sys', type: 'integer' })
  pressureSys: number;

  @Column({ name: 'pressure_dia', type: 'integer' })
  pressureDia: number;

  @Column({ name: 'recorded_at', type: 'timestamp' })
  recordedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', default: () => 'now()' })
  createdAt: Date;
}
