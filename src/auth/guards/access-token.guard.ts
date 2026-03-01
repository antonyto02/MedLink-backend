import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac } from 'crypto';
import { Request } from 'express';
import { UserRole } from '../../database/entities/user.entity';

export interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    email: string;
    role: UserRole;
  };
}

@Injectable()
export class AccessTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token no proporcionado.');
    }

    const token = authHeader.slice(7).trim();
    const payload = this.verifyAccessToken(token);
    request.user = payload;

    return true;
  }

  private verifyAccessToken(token: string): { sub: string; email: string; role: UserRole } {
    const secret = process.env.ACCESS_TOKEN_SECRET;
    if (!secret) {
      throw new UnauthorizedException('ACCESS_TOKEN_SECRET no está configurado.');
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Token inválido.');
    }

    const [headerEncoded, payloadEncoded, signatureEncoded] = parts;
    const unsigned = `${headerEncoded}.${payloadEncoded}`;

    const expectedSignature = createHmac('sha256', secret)
      .update(unsigned)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    if (expectedSignature !== signatureEncoded) {
      throw new UnauthorizedException('Token inválido.');
    }

    const payload = JSON.parse(Buffer.from(payloadEncoded, 'base64url').toString('utf8')) as {
      sub?: string;
      email?: string;
      role?: UserRole;
      exp?: number;
    };

    if (!payload.sub || !payload.email || !payload.role) {
      throw new UnauthorizedException('Token inválido.');
    }

    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp <= now) {
      throw new UnauthorizedException('Token expirado.');
    }

    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
