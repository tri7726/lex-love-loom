export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  supabase: {
    url: process.env.SUPABASE_URL!,
    anonKey: process.env.SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    jwtSecret: process.env.SUPABASE_JWT_SECRET,
    jwksUrl: process.env.SUPABASE_JWKS_URL,
  },
  ai: {
    lovableApiKey: process.env.LOVABLE_API_KEY,
    groqApiKey: process.env.GROQ_API_KEY,
  },
});
