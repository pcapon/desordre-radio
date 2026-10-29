import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  // Public URL as seen through Caddy; empty in local dev.
  url: env('PUBLIC_URL', ''),
  // Trust Caddy's X-Forwarded-* headers so secure admin cookies work over TLS.
  proxy: { koa: env.bool('IS_PROXIED', true) },
  app: {
    keys: env.array('APP_KEYS'),
  },
});

export default config;
