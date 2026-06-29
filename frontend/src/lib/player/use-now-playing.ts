import { useEffect, useState } from 'react'

export type NowPlaying = {
  title?: string
  artist?: string
  source?: string
  show?: string
  startedAt?: string
}

const STRAPI_URL = import.meta.env.VITE_STRAPI_URL ?? 'http://localhost:1337'

// JSON endpoint (Strapi single type) — used for the initial value / fallback.
const NOW_PLAYING_URL: string =
  import.meta.env.VITE_NOW_PLAYING_URL ?? `${STRAPI_URL}/api/now-playing`

// SSE endpoint (worker) — used for live push updates.
const NOW_PLAYING_SSE_URL: string =
  import.meta.env.VITE_NOW_PLAYING_SSE_URL ??
  'http://localhost:3001/now-playing/stream'

function normalize(raw: unknown): NowPlaying | null {
  if (!raw || typeof raw !== 'object') return null
  // Tolerate both a bare object and Strapi's `{ data: {...} }` wrapper.
  const entry = ('data' in raw ? (raw as { data: unknown }).data : raw) as
    | NowPlaying
    | null
  return entry && typeof entry === 'object' ? entry : null
}

/**
 * Live now-playing for the player. On the client it seeds from the JSON
 * endpoint (instant first value, also a fallback if SSE is unavailable) and
 * then subscribes to the worker's SSE stream for push updates. EventSource
 * reconnects on its own. SSR renders without it (now-playing is inherently live).
 */
export function useNowPlaying(enabled: boolean): NowPlaying | null {
  const [data, setData] = useState<NowPlaying | null>(null)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return
    let cancelled = false

    // 1) Seed from JSON so the bar fills immediately.
    fetch(NOW_PLAYING_URL, { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const n = normalize(j)
        if (!cancelled && n) setData(n)
      })
      .catch(() => {})

    // 2) Subscribe to live updates.
    let es: EventSource | null = null
    if ('EventSource' in window) {
      es = new EventSource(NOW_PLAYING_SSE_URL)
      es.addEventListener('now-playing', (e) => {
        try {
          const n = normalize(JSON.parse((e as MessageEvent).data))
          if (!cancelled && n) setData(n)
        } catch {
          /* ignore malformed frame */
        }
      })
      // On error, EventSource auto-reconnects; the seeded value remains.
    }

    return () => {
      cancelled = true
      es?.close()
    }
  }, [enabled])

  return data
}
