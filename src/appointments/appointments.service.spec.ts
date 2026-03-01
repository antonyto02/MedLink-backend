import { ForbiddenException, HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppointmentsService } from './appointments.service';
import { AppointmentStatus } from '../database/entities/appointment.entity';
import { UserRole } from '../database/entities/user.entity';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let dataSource: {
    transaction: jest.Mock;
    getRepository: jest.Mock;
  };

  beforeEach(async () => {
    dataSource = {
      transaction: jest.fn(),
      getRepository: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
  });

  it('creates appointment and marks slot unavailable', async () => {
    const schedule = {
      id: 'schedule-1',
      doctorId: 'doctor-1',
      date: '2026-03-04',
      time: '08:30:00',
      available: true,
    };

    const scheduleRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(schedule),
      }),
      save: jest.fn().mockResolvedValue(undefined),
    };

    const appointmentRepo = {
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockResolvedValue({
        id: 'appointment-1',
        doctorId: 'doctor-1',
        patientId: 'patient-1',
        status: AppointmentStatus.PROGRAMADA,
      }),
    };

    dataSource.transaction.mockImplementation(async (cb) =>
      cb({
        getRepository: jest
          .fn()
          .mockReturnValueOnce(scheduleRepo)
          .mockReturnValueOnce(appointmentRepo),
      }),
    );

    const result = await service.create(
      { doctor_id: 'doctor-1', schedule_id: 'schedule-1' },
      { user: { sub: 'patient-1', email: 'p@mail.com', role: UserRole.PATIENT } } as any,
    );

    expect(result).toEqual({
      appointment: {
        id: 'appointment-1',
        doctor_id: 'doctor-1',
        patient_id: 'patient-1',
        date: '2026-03-04',
        time: '08:30',
        status: 'programada',
      },
    });
    expect(scheduleRepo.save).toHaveBeenCalledWith({ ...schedule, available: false });
  });

  it('throws ONLY_PATIENT_CAN_BOOK when requester is not patient', async () => {
    await expect(
      service.create(
        { doctor_id: 'doctor-1', schedule_id: 'schedule-1' },
        { user: { sub: 'doctor-2', email: 'd@mail.com', role: UserRole.DOCTOR } } as any,
      ),
    ).rejects.toMatchObject({
      response: { error: { code: 'ONLY_PATIENT_CAN_BOOK' } },
      status: 403,
    } as ForbiddenException);
  });

  it('throws SLOT_NOT_AVAILABLE when slot is already occupied', async () => {
    const scheduleRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'schedule-1',
          doctorId: 'doctor-1',
          date: '2026-03-04',
          time: '08:30:00',
          available: false,
        }),
      }),
    };

    dataSource.transaction.mockImplementation(async (cb) =>
      cb({
        getRepository: jest.fn().mockReturnValue(scheduleRepo),
      }),
    );

    await expect(
      service.create(
        { doctor_id: 'doctor-1', schedule_id: 'schedule-1' },
        { user: { sub: 'patient-1', email: 'p@mail.com', role: UserRole.PATIENT } } as any,
      ),
    ).rejects.toMatchObject({
      response: { error: { code: 'SLOT_NOT_AVAILABLE' } },
      status: 409,
    } as HttpException);
  });

  it('returns logged patient appointments with doctor/date/time/status', async () => {
    const queryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        {
          id: 'appointment-1',
          doctor: 'Dr. Juan Perez',
          date: '2026-03-04',
          time: '08:30:00',
          status: AppointmentStatus.PROGRAMADA,
        },
      ]),
    };

    dataSource.getRepository.mockReturnValue({
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    });

    const result = await service.getMyAppointments({
      user: { sub: 'patient-1', email: 'p@mail.com', role: UserRole.PATIENT },
    } as any);

    expect(result).toEqual([
      {
        id: 'appointment-1',
        doctor: 'Dr. Juan Perez',
        date: '2026-03-04',
        time: '08:30',
        status: AppointmentStatus.PROGRAMADA,
      },
    ]);
  });

  it('returns empty array for doctor user in /appointments/me', async () => {
    const result = await service.getMyAppointments({
      user: { sub: 'doctor-1', email: 'd@mail.com', role: UserRole.DOCTOR },
    } as any);

    expect(result).toEqual([]);
    expect(dataSource.getRepository).not.toHaveBeenCalled();
  });
});
