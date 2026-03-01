import { UserRole } from '../../database/entities/user.entity';

export class RegisterDto {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}
