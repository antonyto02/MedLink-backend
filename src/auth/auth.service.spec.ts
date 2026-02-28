import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { User, UserRole } from '../database/entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    process.env.ACCESS_TOKEN_SECRET = 'test_secret';
    process.env.ACCESS_TOKEN_EXPIRES_IN = '15m';

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
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersRepository = module.get(getRepositoryToken(User));
  });

  it('registers a user and returns a token', async () => {
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
    expect(usersRepository.create).toHaveBeenCalled();
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
