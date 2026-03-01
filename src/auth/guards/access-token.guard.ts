import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
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
      throw this.unauthorized();
    }

    const token = authHeader.slice(7).trim();
    const payload = this.verifyAccessToken(token);
    request.user = payload;

    return true;
  }

  private verifyAccessToken(token: string): { sub: string; email: string; role: UserRole } {
    const secret = process.env.ACCESS_TOKEN_SECRET;
    if (!secret) {
      throw this.unauthorized();
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      throw this.unauthorized();
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
      throw this.unauthorized();
    }

    const payload = JSON.parse(Buffer.from(payloadEncoded, 'base64url').toString('utf8')) as {
      sub?: string;
      email?: string;
      role?: UserRole;
      exp?: number;
    };

    if (!payload.sub || !payload.email || !payload.role) {
      throw this.unauthorized();
    }

    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp <= now) {
      throw this.unauthorized();
    }

    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }

  private unauthorized(): HttpException {
    return new HttpException({ error: { code: 'UNAUTHORIZED' } }, HttpStatus.UNAUTHORIZED);
  }
}
