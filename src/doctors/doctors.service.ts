import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { User, UserRole } from '../database/entities/user.entity';

export interface DoctorListItem {
  id: string;
  name: string;
}

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findAll(): Promise<DoctorListItem[]> {
    return this.usersRepository.find({
      where: { role: UserRole.DOCTOR, deletedAt: IsNull() },
      select: { id: true, name: true },
      order: { name: 'ASC' },
    });
  }
}
