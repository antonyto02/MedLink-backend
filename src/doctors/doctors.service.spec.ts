import { HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { DoctorSchedule } from '../database/entities/doctor-schedule.entity';
import { User, UserRole } from '../database/entities/user.entity';
import { DoctorsService } from './doctors.service';

describe('DoctorsService', () => {
  let service: DoctorsService;
  let usersRepository: jest.Mocked<Repository<User>>;
  let doctorScheduleRepository: jest.Mocked<Repository<DoctorSchedule>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoctorsService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DoctorSchedule),
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DoctorsService>(DoctorsService);
    usersRepository = module.get(getRepositoryToken(User));
    doctorScheduleRepository = module.get(getRepositoryToken(DoctorSchedule));
  });

  it('returns doctors with only id and name', async () => {
    usersRepository.find.mockResolvedValue([
      { id: 'uuid1', name: 'Dr. Juan Perez' },
      { id: 'uuid2', name: 'Dra. Maria Lopez' },
    ] as User[]);

    const result = await service.findAll();

    expect(result).toEqual([
      { id: 'uuid1', name: 'Dr. Juan Perez' },
      { id: 'uuid2', name: 'Dra. Maria Lopez' },
    ]);
    expect(usersRepository.find).toHaveBeenCalledWith({
      where: { role: UserRole.DOCTOR, deletedAt: IsNull() },
      select: { id: true, name: true },
      order: { name: 'ASC' },
    });
  });

  it('returns schedule for a doctor on a date including availability', async () => {
    usersRepository.findOne.mockResolvedValue({ id: 'doctor-1' } as User);
    doctorScheduleRepository.find.mockResolvedValue([
      { id: 'uuid1', time: '08:00:00', available: true },
      { id: 'uuid2', time: '08:30:00', available: false },
    ] as DoctorSchedule[]);

    const result = await service.findAvailableSchedule('doctor-1', '2026-03-04');

    expect(result).toEqual({
      date: '2026-03-04',
      slots: [
        { schedule_id: 'uuid1', time: '08:00', available: true },
        { schedule_id: 'uuid2', time: '08:30', available: false },
      ],
    });
    expect(usersRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'doctor-1', role: UserRole.DOCTOR, deletedAt: IsNull() },
      select: { id: true },
    });
    expect(doctorScheduleRepository.find).toHaveBeenCalledWith({
      where: { doctorId: 'doctor-1', date: '2026-03-04' },
      select: { id: true, time: true, available: true },
      order: { time: 'ASC' },
    });
  });

  it('throws DATE_REQUIRED when date is missing', async () => {
    await expect(service.findAvailableSchedule('doctor-1')).rejects.toMatchObject({
      response: { error: { code: 'DATE_REQUIRED' } },
      status: 400,
    } as HttpException);
  });

  it('throws DOCTOR_NOT_FOUND when doctor does not exist', async () => {
    usersRepository.findOne.mockResolvedValue(null);

    await expect(service.findAvailableSchedule('doctor-1', '2026-03-04')).rejects.toMatchObject({
      response: { error: { code: 'DOCTOR_NOT_FOUND' } },
      status: 404,
    } as HttpException);
  });
});
