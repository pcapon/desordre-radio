import { config } from './config.js'

/** Minimal shapes of the Strapi 5 (flattened) entities the worker consumes. */
export interface StrapiMedia {
  url: string
  mime?: string
}

export interface Track {
  id: number
  documentId: string
  title: string
  artist?: string
  duration?: number
  weight?: number
  enabled?: boolean
  externalUrl?: string
  audio?: StrapiMedia | null
  /** ISO datetime. When set, the track plays at this exact time (not rotation). */
  scheduledAt?: string | null
  show?: { title?: string } | null
}

async function strapiGet<T>(path: string): Promise<T> {
  const url = `${config.strapiUrl}/api/${path}`
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (config.strapiToken) headers.Authorization = `Bearer ${config.strapiToken}`

  const res = await fetch(url, { headers })
  if (!res.ok) {
    throw new Error(`Strapi GET ${path} → ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as T
}

/**
 * All enabled+published tracks, with `show` and `audio` populated. The worker
 * partitions these into the rotation pool (no `scheduledAt`) and the scheduled
 * set (a `scheduledAt` in the future) — see RadioState.
 */
export async function fetchEnabledTracks(): Promise<Track[]> {
  const data = await strapiGet<{ data: Track[] }>(
    'tracks?populate[audio]=true&populate[show][fields][0]=title&filters[enabled][$eq]=true&pagination[pageSize]=500',
  )
  return data.data ?? []
}

export interface NowPlayingPayload {
  title?: string
  artist?: string
  source?: string
  trackDocumentId?: string
  show?: string
  artworkUrl?: string
  startedAt?: string
  raw?: unknown
}

/**
 * Persist the current track to the `now-playing` single type so the frontend
 * can read it from Strapi. Single types are written via PUT /api/now-playing.
 * Requires a Strapi API token with update permission on now-playing.
 */
export async function writeNowPlaying(payload: NowPlayingPayload): Promise<void> {
  if (!config.strapiToken) return // no token → skip CMS write, worker still caches it
  const res = await fetch(`${config.strapiUrl}/api/now-playing`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.strapiToken}`,
    },
    body: JSON.stringify({ data: payload }),
  })
  if (!res.ok) {
    throw new Error(
      `Strapi PUT now-playing → ${res.status} ${res.statusText}`,
    )
  }
}

/** Append a "recently played" history entry. Requires a token with create perm. */
export async function appendNowPlayingHistory(
  payload: NowPlayingPayload,
): Promise<void> {
  if (!config.strapiToken) return
  const res = await fetch(`${config.strapiUrl}/api/now-playing-histories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.strapiToken}`,
    },
    body: JSON.stringify({
      data: {
        title: payload.title,
        artist: payload.artist,
        source: payload.source,
        trackDocumentId: payload.trackDocumentId,
        playedAt: payload.startedAt ?? new Date().toISOString(),
      },
    }),
  })
  if (!res.ok) {
    throw new Error(`Strapi POST history → ${res.status} ${res.statusText}`)
  }
}

/** Resolve the playable URL for a track (external URL wins, else uploaded media). */
export function trackAudioUrl(track: Track): string | null {
  if (track.externalUrl) return track.externalUrl
  if (track.audio?.url) {
    const u = track.audio.url
    if (u.startsWith('http://') || u.startsWith('https://')) return u
    return `${config.mediaBaseUrl}${u.startsWith('/') ? '' : '/'}${u}`
  }
  return null
}
