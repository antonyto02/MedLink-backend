import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, randomBytes, scryptSync } from 'crypto';
import { Repository } from 'typeorm';
import { DoctorSchedule } from '../database/entities/doctor-schedule.entity';
import { User, UserRole } from '../database/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
}

export interface RegisterResponse extends AuthResponse {}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(DoctorSchedule)
    private readonly doctorScheduleRepository: Repository<DoctorSchedule>,
  ) {}

  async register(input: RegisterDto): Promise<RegisterResponse> {
    this.validateRegisterInput(input);

    const normalizedEmail = input.email.trim().toLowerCase();
    const exists = await this.usersRepository.exists({ where: { email: normalizedEmail } });

    if (exists) {
      throw new ConflictException('El correo ya está registrado.');
    }

    const user = this.usersRepository.create({
      name: input.name.trim(),
      email: normalizedEmail,
      passwordHash: this.hashPassword(input.password),
      role: input.role,
    });

    try {
      const savedUser = await this.usersRepository.save(user);

      if (savedUser.role === UserRole.DOCTOR) {
        await this.generateDoctorSchedules(savedUser.id);
      }

      return this.buildAuthResponse(savedUser);
    } catch (error: unknown) {
      const dbCode = (error as { code?: string })?.code;
      if (dbCode === '23505') {
        throw new ConflictException('El correo ya está registrado.');
      }

      throw new InternalServerErrorException('No se pudo registrar el usuario.');
    }
  }

  async login(input: LoginDto): Promise<AuthResponse> {
    this.validateLoginInput(input);

    const normalizedEmail = input.email.trim().toLowerCase();
    const user = await this.usersRepository.findOne({ where: { email: normalizedEmail } });

    if (!user || !this.verifyPassword(input.password, user.passwordHash)) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    return this.buildAuthResponse(user);
  }

  private async generateDoctorSchedules(doctorId: string): Promise<void> {
    const slots = this.buildDoctorScheduleSlots(doctorId);
    if (!slots.length) {
      return;
    }

    await this.doctorScheduleRepository
      .createQueryBuilder()
      .insert()
      .into(DoctorSchedule)
      .values(slots)
      .orIgnore()
      .execute();
  }

  private buildDoctorScheduleSlots(doctorId: string): Array<Pick<DoctorSchedule, 'doctorId' | 'date' | 'time' | 'available'>> {
    const slots: Array<Pick<DoctorSchedule, 'doctorId' | 'date' | 'time' | 'available'>> = [];
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    for (let dayOffset = 0; dayOffset < 90; dayOffset += 1) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + dayOffset);

      const dayOfWeek = currentDate.getDay();
      const date = this.formatDate(currentDate);

      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        this.pushHalfHourRange(slots, doctorId, date, '08:00', '14:00');
        this.pushHalfHourRange(slots, doctorId, date, '16:00', '20:00');
      } else if (dayOfWeek === 6) {
        this.pushHalfHourRange(slots, doctorId, date, '09:00', '13:00');
      }
    }

    return slots;
  }

  private pushHalfHourRange(
    slots: Array<Pick<DoctorSchedule, 'doctorId' | 'date' | 'time' | 'available'>>,
    doctorId: string,
    date: string,
    startTime: string,
    endTime: string,
  ): void {
    let currentMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);

    while (currentMinutes < endMinutes) {
      slots.push({
        doctorId,
        date,
        time: this.minutesToTime(currentMinutes),
        available: true,
      });

      currentMinutes += 30;
    }
  }

  private timeToMinutes(value: string): number {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(value: number): string {
    const hours = Math.floor(value / 60)
      .toString()
      .padStart(2, '0');
    const minutes = (value % 60).toString().padStart(2, '0');

    return `${hours}:${minutes}:00`;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private validateRegisterInput(input: RegisterDto): void {
    if (!input || typeof input !== 'object') {
      throw new BadRequestException('Body inválido.');
    }

    if (typeof input.name !== 'string' || input.name.trim().length < 2) {
      throw new BadRequestException('El nombre es obligatorio y debe tener al menos 2 caracteres.');
    }

    if (typeof input.email !== 'string' || !this.isValidEmail(input.email)) {
      throw new BadRequestException('El correo no es válido.');
    }

    if (typeof input.password !== 'string' || input.password.length < 6) {
      throw new BadRequestException('La contraseña debe tener al menos 6 caracteres.');
    }

    if (input.role !== UserRole.PATIENT && input.role !== UserRole.DOCTOR) {
      throw new BadRequestException('El rol debe ser patient o doctor.');
    }
  }

  private validateLoginInput(input: LoginDto): void {
    if (!input || typeof input !== 'object') {
      throw new BadRequestException('Body inválido.');
    }

    if (typeof input.email !== 'string' || !this.isValidEmail(input.email)) {
      throw new BadRequestException('El correo no es válido.');
    }

    if (typeof input.password !== 'string' || input.password.length < 6) {
      throw new BadRequestException('La contraseña debe tener al menos 6 caracteres.');
    }
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');

    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, passwordHash: string): boolean {
    const [salt, storedHash] = passwordHash.split(':');
    if (!salt || !storedHash) {
      return false;
    }

    const calculatedHash = scryptSync(password, salt, 64).toString('hex');
    return storedHash === calculatedHash;
  }

  private buildAuthResponse(user: User): AuthResponse {
    const token = this.signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  private signAccessToken(payload: { sub: string; email: string; role: UserRole }): string {
    const secret = process.env.ACCESS_TOKEN_SECRET;

    if (!secret) {
      throw new InternalServerErrorException('ACCESS_TOKEN_SECRET no está configurado.');
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresInRaw = process.env.ACCESS_TOKEN_EXPIRES_IN ?? '15m';
    const expiresInSeconds = this.parseDurationToSeconds(expiresInRaw);

    const jwtPayload = {
      ...payload,
      iat: now,
      exp: now + expiresInSeconds,
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(jwtPayload));
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    const signature = createHmac('sha256', secret)
      .update(unsignedToken)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return `${unsignedToken}.${signature}`;
  }

  private parseDurationToSeconds(value: string): number {
    const trimmed = value.trim();
    const match = trimmed.match(/^(\d+)([smhd])?$/i);

    if (!match) {
      throw new InternalServerErrorException('ACCESS_TOKEN_EXPIRES_IN tiene formato inválido.');
    }

    const amount = Number(match[1]);
    const unit = (match[2] ?? 's').toLowerCase();

    const factorByUnit: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    return amount * factorByUnit[unit];
  }

  private base64UrlEncode(value: string): string {
    return Buffer.from(value)
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }
}
