import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Appointment } from './database/entities/appointment.entity';
import { DoctorSchedule } from './database/entities/doctor-schedule.entity';
import { User } from './database/entities/user.entity';
import { VitalSign } from './database/entities/vital-sign.entity';

const databaseImports = process.env.DATABASE_URL
  ? [
      TypeOrmModule.forRoot({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        entities: [User, DoctorSchedule, Appointment, VitalSign],
        migrations: [join(__dirname, 'database/migrations/*{.ts,.js}')],
        migrationsRun: true,
        synchronize: false,
      }),
    ]
  : [];

@Module({
  imports: [...databaseImports],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
