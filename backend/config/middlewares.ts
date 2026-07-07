import type { Core } from '@strapi/strapi';

function cspSourceOrigins(...values: Array<string | undefined>): string[] {
  const origins = new Set<string>()

  for (const value of values) {
    if (!value) continue

    try {
      origins.add(new URL(value).origin)
    } catch {
      if (value.startsWith('http://') || value.startsWith('https://')) continue
      origins.add(value)
    }
  }

  return [...origins]
}

const externalMediaOrigins =
  process.env.S3_BUCKET || process.env.CDN_URL
    ? cspSourceOrigins(
        process.env.CDN_URL,
        process.env.S3_ENDPOINT,
        process.env.MEDIA_DOMAIN
          ? `https://${process.env.MEDIA_DOMAIN}`
          : undefined,
      )
    : []

const imgSrc = [
  "'self'",
  'data:',
  'blob:',
  'https://market-assets.strapi.io',
  ...externalMediaOrigins,
]

const mediaSrc = ["'self'", 'data:', 'blob:', ...externalMediaOrigins]

const config: Core.Config.Middlewares = [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        directives: {
          'img-src': imgSrc,
          'media-src': mediaSrc,
        },
      },
    },
  },
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];

export default config;
