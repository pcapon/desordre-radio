function env(name: string, fallback: string): string {
  const v = process.env[name]
  return v === undefined || v === '' ? fallback : v
}

function envInt(name: string, fallback: number): number {
  const v = process.env[name]
  if (v === undefined || v === '') return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export const config = {
  port: envInt('WORKER_PORT', 3001),

  // Strapi
  strapiUrl: env('STRAPI_URL', 'http://strapi:1337'),
  strapiToken: env('STRAPI_API_TOKEN', ''),

  // Public base used to rewrite relative media URLs Liquidsoap must fetch.
  // Liquidsoap reaches Strapi over the internal network by default.
  mediaBaseUrl: env('MEDIA_BASE_URL', env('STRAPI_URL', 'http://strapi:1337')),

  // Liquidsoap telnet
  liquidsoapHost: env('LIQUIDSOAP_HOST', 'liquidsoap'),
  liquidsoapTelnetPort: envInt('LIQUIDSOAP_TELNET_PORT', 1234),

  // Scheduler
  pollIntervalMs: envInt('POLL_INTERVAL_MS', 30_000),

  // Avoid replaying the same track within this many picks.
  noRepeatWindow: envInt('NO_REPEAT_WINDOW', 10),

  timezone: env('RADIO_TIMEZONE', 'Europe/Paris'),

  // Listeners hear the stream behind the source (Icecast burst + client buffer).
  // Delay now-playing updates by ~this much so the UI matches what's audible.
  streamBufferDelayMs: envInt('STREAM_BUFFER_DELAY_MS', 10_000),

  // Shared secret Liquidsoap must send on POST /metadata. Empty = no check
  // (fine on a private network; set it when the worker is otherwise reachable).
  metadataSecret: env('METADATA_SECRET', ''),

  // Shared secret for operator-only POST /play-now requests. Falls back to the
  // metadata secret so existing deployments can protect both paths together.
  playNowSecret: env('PLAY_NOW_SECRET', env('METADATA_SECRET', '')),
} as const

export type Config = typeof config
