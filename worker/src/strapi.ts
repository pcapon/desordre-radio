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
}

export interface Playlist {
  id: number
  documentId: string
  name: string
  slug?: string
  kind?: string
  shuffle?: boolean
  isDefault?: boolean
  tracks?: Track[]
}

export interface Schedule {
  id: number
  documentId: string
  name: string
  daysOfWeek?: string[] | null
  startTime: string // "HH:mm:ss.SSS" or "HH:mm"
  endTime: string
  priority?: number
  enabled?: boolean
  timezone?: string
  playlist?: Playlist | null
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

export async function fetchEnabledTracks(): Promise<Track[]> {
  const data = await strapiGet<{ data: Track[] }>(
    'tracks?populate=audio&filters[enabled][$eq]=true&pagination[pageSize]=500',
  )
  return data.data ?? []
}

export async function fetchPlaylists(): Promise<Playlist[]> {
  const data = await strapiGet<{ data: Playlist[] }>(
    'playlists?populate[tracks][populate]=audio&pagination[pageSize]=200',
  )
  return data.data ?? []
}

export async function fetchSchedules(): Promise<Schedule[]> {
  const data = await strapiGet<{ data: Schedule[] }>(
    'schedules?populate[playlist][populate][tracks][populate]=audio&filters[enabled][$eq]=true&pagination[pageSize]=200',
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
