import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private jwks?: ReturnType<typeof createRemoteJWKSet>;

  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {
    const jwksUrl = this.config.get<string>('supabase.jwksUrl');
    if (jwksUrl) this.jwks = createRemoteJWKSet(new URL(jwksUrl));
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const auth = req.headers.authorization as string | undefined;
    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const token = auth.slice(7);

    try {
      let payload: JWTPayload;
      if (this.jwks) {
        ({ payload } = await jwtVerify(token, this.jwks));
      } else {
        const secret = this.config.get<string>('supabase.jwtSecret');
        if (!secret) throw new Error('No JWKS or JWT secret configured');
        ({ payload } = await jwtVerify(token, new TextEncoder().encode(secret)));
      }

      req.user = {
        id: payload.sub,
        email: (payload as { email?: string }).email,
        role: (payload as { role?: string }).role,
        claims: payload,
      };
      return true;
    } catch (err) {
      throw new UnauthorizedException(
        `Invalid token: ${(err as Error).message}`,
      );
    }
  }
}
