import { Env } from '../index';

export function getResolvedConfig(env: Env) {
  return {
    jwtSecret: env.JWT_SECRET,
    isHosted: true, // Cloudflare version is always hosted
    host: env.SITE_URL,
    checkout: {
      enabled: false, // Simplified for Cloudflare free tier
      url: '',
    },
    sendgrid: {
      apiKey: env.SENDGRID_API_KEY,
    },
    fromEmail: env.FROM_EMAIL || 'Cusdis Notification<notification@cusdis.com>',
  };
}

export const VERSION = '1.4.0-cloudflare';