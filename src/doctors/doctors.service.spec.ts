import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { User, UserRole } from '../database/entities/user.entity';
import { DoctorsService } from './doctors.service';

describe('DoctorsService', () => {
  let service: DoctorsService;
  let usersRepository: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoctorsService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DoctorsService>(DoctorsService);
    usersRepository = module.get(getRepositoryToken(User));
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
});
