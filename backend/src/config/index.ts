import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function requiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

export const config = {
  // Server
  port: parseInt(optionalEnv('PORT', '3000'), 10),
  nodeEnv: optionalEnv('NODE_ENV', 'development'),
  corsOrigin: optionalEnv('CORS_ORIGIN', 'http://localhost:5173'),

  // Database
  databaseUrl: requiredEnv('DATABASE_URL'),

  // Redis
  redisUrl: optionalEnv('REDIS_URL', 'redis://localhost:6379'),

  // JWT
  jwtSecret: requiredEnv('JWT_SECRET'),
  jwtRefreshSecret: requiredEnv('JWT_REFRESH_SECRET'),
  jwtAccessExpiry: optionalEnv('JWT_ACCESS_EXPIRY', '15m'),
  jwtRefreshExpiry: optionalEnv('JWT_REFRESH_EXPIRY', '7d'),

  // Anthropic LLM
  anthropicApiKey: optionalEnv('ANTHROPIC_API_KEY', ''),
  llmTimeout: parseInt(optionalEnv('LLM_TIMEOUT_MS', '30000'), 10),

  // Email (SMTP)
  smtp: {
    host: optionalEnv('SMTP_HOST', 'smtp.gmail.com'),
    port: parseInt(optionalEnv('SMTP_PORT', '587'), 10),
    secure: optionalEnv('SMTP_SECURE', 'false') === 'true',
    user: optionalEnv('SMTP_USER', ''),
    pass: optionalEnv('SMTP_PASS', ''),
    from: optionalEnv('SMTP_FROM', 'Healthcare App <noreply@healthcare.app>'),
  },

  // Google Calendar OAuth
  google: {
    clientId: optionalEnv('GOOGLE_CLIENT_ID', ''),
    clientSecret: optionalEnv('GOOGLE_CLIENT_SECRET', ''),
    redirectUri: optionalEnv('GOOGLE_REDIRECT_URI', 'http://localhost:3000/api/calendar/callback'),
  },

  // Booking
  slotHoldMinutes: parseInt(optionalEnv('SLOT_HOLD_MINUTES', '5'), 10),

  // Background jobs
  notificationMaxRetries: parseInt(optionalEnv('NOTIFICATION_MAX_RETRIES', '5'), 10),
} as const;

export type Config = typeof config;
