import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  /** Service-role client. Bypasses RLS — use only on server. */
  admin!: SupabaseClient;
  /** Anonymous client. Respects RLS. Useful for forwarding user JWT. */
  anon!: SupabaseClient;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const url = this.config.getOrThrow<string>('supabase.url');
    const serviceKey = this.config.getOrThrow<string>('supabase.serviceRoleKey');
    const anonKey = this.config.getOrThrow<string>('supabase.anonKey');

    this.admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    this.anon = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  /** Returns a client that proxies the user's JWT (RLS-aware). */
  forUser(jwt: string): SupabaseClient {
    const url = this.config.getOrThrow<string>('supabase.url');
    const anonKey = this.config.getOrThrow<string>('supabase.anonKey');
    return createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
}
