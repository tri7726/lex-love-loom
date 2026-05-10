import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AppRole, ROLES_KEY } from '../decorators/roles.decorator';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly supabase: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const req = context.switchToHttp().getRequest();
    const userId = req.user?.id;
    if (!userId) throw new ForbiddenException('No authenticated user');

    // Check via public.has_role() RPC for each required role (OR semantics).
    for (const role of required) {
      const { data, error } = await this.supabase.admin.rpc('has_role', {
        _user_id: userId,
        _role: role,
      });
      if (!error && data === true) return true;
    }
    throw new ForbiddenException('Insufficient role');
  }
}
