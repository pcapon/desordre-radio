import { useEffect, useState } from 'react'
import { AZURACAST_STATION, AZURACAST_URL } from './radio-config'

export type NowPlaying = {
  title?: string
  artist?: string
  /** Streamer / DJ name while a live broadcast is on air. */
  show?: string
  /** AzuraCast playlist the current track was picked from. */
  playlist?: string
  artworkUrl?: string
  isLive: boolean
}

/** The subset of AzuraCast's NowPlaying payload the player uses. */
type AzuraNowPlaying = {
  live?: { is_live?: boolean; streamer_name?: string; art?: string | null }
  now_playing?: {
    song?: { title?: string; artist?: string; art?: string }
    playlist?: string
  } | null
}

function normalize(np: AzuraNowPlaying | undefined): NowPlaying | null {
  if (!np || typeof np !== 'object') return null
  const song = np.now_playing?.song
  const isLive = Boolean(np.live?.is_live)
  return {
    title: song?.title || undefined,
    artist: song?.artist || undefined,
    show: isLive ? np.live?.streamer_name || undefined : undefined,
    playlist: np.now_playing?.playlist || undefined,
    artworkUrl: (isLive && np.live?.art) || song?.art || undefined,
    isLive,
  }
}

/**
 * Live now-playing from AzuraCast. Seeds from the public REST endpoint, then
 * subscribes to AzuraCast's built-in SSE feed (Centrifugo). Requires
 * "High-Performance Now Playing Updates" in AzuraCast's system settings; the
 * seeded value remains if SSE is unavailable. EventSource reconnects on its
 * own. SSR renders without it (now-playing is inherently live).
 */
export function useNowPlaying(): NowPlaying | null {
  const [data, setData] = useState<NowPlaying | null>(null)

  useEffect(() => {
    if (!AZURACAST_URL || typeof window === 'undefined') return
    let cancelled = false
    const apply = (np: AzuraNowPlaying | undefined) => {
      const n = normalize(np)
      if (!cancelled && n) setData(n)
    }

    // 1) Seed from JSON so the bar fills immediately.
    fetch(`${AZURACAST_URL}/api/nowplaying/${AZURACAST_STATION}`, {
      headers: { Accept: 'application/json' },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: AzuraNowPlaying | null) => apply(j ?? undefined))
      .catch(() => {})

    // 2) Subscribe to live updates. Frames are either the initial `connect`
    //    (with cached publications per subscription) or a `pub` push.
    let es: EventSource | null = null
    if ('EventSource' in window) {
      const channel = `station:${AZURACAST_STATION}`
      const params = new URLSearchParams({
        cf_connect: JSON.stringify({ subs: { [channel]: { recover: true } } }),
      })
      es = new EventSource(`${AZURACAST_URL}/api/live/nowplaying/sse?${params}`)
      es.onmessage = (e) => {
        try {
          const frame = JSON.parse(e.data)
          if (frame.pub) {
            apply(frame.pub.data?.np)
          } else if (frame.connect) {
            const pubs = frame.connect.subs?.[channel]?.publications ?? []
            const last = pubs[pubs.length - 1]
            if (last) apply(last.data?.np)
          }
        } catch {
          /* ignore malformed frame */
        }
      }
    }

    return () => {
      cancelled = true
      es?.close()
    }
  }, [])

  return data
}
