import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { SupabaseService } from '../../common/supabase/supabase.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly supabase: SupabaseService) {}

  @Public()
  @Get()
  async check() {
    let db: 'ok' | 'down' = 'ok';
    try {
      const { error } = await this.supabase.admin
        .from('profiles')
        .select('id', { head: true, count: 'exact' })
        .limit(1);
      if (error) db = 'down';
    } catch {
      db = 'down';
    }
    return {
      status: 'ok',
      uptime: process.uptime(),
      db,
      timestamp: new Date().toISOString(),
    };
  }
}
