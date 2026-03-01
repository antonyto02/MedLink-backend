import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { DoctorsModule } from './doctors/doctors.module';
import { DatabaseConnectionService } from './database/database-connection.service';
import { Appointment } from './database/entities/appointment.entity';
import { DoctorSchedule } from './database/entities/doctor-schedule.entity';
import { User } from './database/entities/user.entity';
import { VitalSign } from './database/entities/vital-sign.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const databaseUrl = process.env.DATABASE_URL;

        if (!databaseUrl) {
          throw new Error('DATABASE_URL no está definida.');
        }

        return {
          type: 'postgres' as const,
          url: databaseUrl,
          entities: [User, DoctorSchedule, Appointment, VitalSign],
          migrations: [join(__dirname, 'database/migrations/*{.ts,.js}')],
          migrationsRun: true,
          synchronize: false,
        };
      },
    }),
    AuthModule,
    AppointmentsModule,
    DoctorsModule,
  ],
  controllers: [AppController],
  providers: [AppService, DatabaseConnectionService],
})
export class AppModule {}
