import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { DoctorSchedule } from '../database/entities/doctor-schedule.entity';
import { User, UserRole } from '../database/entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: jest.Mocked<Repository<User>>;
  let doctorScheduleRepository: jest.Mocked<Repository<DoctorSchedule>>;
  let queryBuilderMock: {
    insert: jest.Mock;
    into: jest.Mock;
    values: jest.Mock;
    orIgnore: jest.Mock;
    execute: jest.Mock;
  };

  beforeEach(async () => {
    process.env.ACCESS_TOKEN_SECRET = 'test_secret';
    process.env.ACCESS_TOKEN_EXPIRES_IN = '15m';

    queryBuilderMock = {
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            exists: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DoctorSchedule),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersRepository = module.get(getRepositoryToken(User));
    doctorScheduleRepository = module.get(getRepositoryToken(DoctorSchedule));
  });

  it('registers a patient and returns a token without generating schedules', async () => {
    const input = {
      name: 'Juan Perez',
      email: 'juan@mail.com',
      password: '123456',
      role: UserRole.PATIENT,
    };

    usersRepository.exists.mockResolvedValue(false);
    usersRepository.create.mockImplementation((data) => data as User);
    usersRepository.save.mockResolvedValue({
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Juan Perez',
      email: 'juan@mail.com',
      role: UserRole.PATIENT,
      passwordHash: 'salt:hash',
    } as User);

    const result = await service.register(input);

    expect(result.user.email).toBe('juan@mail.com');
    expect(result.user.role).toBe(UserRole.PATIENT);
    expect(result.token.split('.')).toHaveLength(3);
    expect(doctorScheduleRepository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('registers a doctor and generates schedules for the next 90 days', async () => {
    usersRepository.exists.mockResolvedValue(false);
    usersRepository.create.mockImplementation((data) => data as User);
    usersRepository.save.mockResolvedValue({
      id: 'doctor-uuid',
      name: 'Dr. Juan Perez',
      email: 'dr.juan@mail.com',
      role: UserRole.DOCTOR,
      passwordHash: 'salt:hash',
    } as User);

    const result = await service.register({
      name: 'Dr. Juan Perez',
      email: 'dr.juan@mail.com',
      password: '123456',
      role: UserRole.DOCTOR,
    });

    expect(result.user.role).toBe(UserRole.DOCTOR);
    expect(doctorScheduleRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(queryBuilderMock.insert).toHaveBeenCalledTimes(1);
    expect(queryBuilderMock.orIgnore).toHaveBeenCalledTimes(1);
    expect(queryBuilderMock.execute).toHaveBeenCalledTimes(1);

    const insertedSlots = queryBuilderMock.values.mock.calls[0][0] as Array<{
      doctorId: string;
      date: string;
      time: string;
      available: boolean;
    }>;

    expect(insertedSlots.length).toBeGreaterThan(0);
    expect(insertedSlots.every((slot) => slot.doctorId === 'doctor-uuid')).toBe(true);
    expect(insertedSlots.every((slot) => slot.available === true)).toBe(true);
  });

  it('throws conflict when email already exists', async () => {
    usersRepository.exists.mockResolvedValue(true);

    await expect(
      service.register({
        name: 'Juan Perez',
        email: 'juan@mail.com',
        password: '123456',
        role: UserRole.PATIENT,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('logs in successfully with valid credentials', async () => {
    usersRepository.findOne.mockResolvedValue({
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Juan Perez',
      email: 'juan@mail.com',
      role: UserRole.PATIENT,
      passwordHash:
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:199ea45006bb3a3771ed77ed41a3dc0e4471d1aa7a27d2f95b0524e9b8813dd160c4e5ddd6590dc7fd090aef92f9f1717c10b12b21bb21f52e08122771014ce5',
    } as User);

    const result = await service.login({
      email: 'juan@mail.com',
      password: '123456',
    });

    expect(result.user.email).toBe('juan@mail.com');
    expect(result.token.split('.')).toHaveLength(3);
  });

  it('throws unauthorized for invalid credentials', async () => {
    usersRepository.findOne.mockResolvedValue({
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Juan Perez',
      email: 'juan@mail.com',
      role: UserRole.PATIENT,
      passwordHash: 'salt:invalidhash',
    } as User);

    await expect(
      service.login({
        email: 'juan@mail.com',
        password: '123456',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
