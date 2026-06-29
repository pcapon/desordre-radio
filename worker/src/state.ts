import { config } from './config.js'
import {
  fetchEnabledTracks,
  fetchPlaylists,
  fetchSchedules,
  trackAudioUrl,
  type NowPlayingPayload,
  type Playlist,
  type Schedule,
  type Track,
} from './strapi.js'

/** Local weekday ("mon"…) and minutes-since-midnight in the radio timezone. */
function localTimeParts(now: Date): { day: string; minutes: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: config.timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = fmt.formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  const wd = get('weekday').toLowerCase().slice(0, 3)
  let hour = parseInt(get('hour'), 10)
  if (hour === 24) hour = 0 // some runtimes emit "24" at midnight
  const minute = parseInt(get('minute'), 10)
  return { day: wd, minutes: hour * 60 + minute }
}

/** Parse "HH:mm" / "HH:mm:ss.SSS" → minutes since midnight. */
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':')
  return parseInt(h, 10) * 60 + parseInt(m ?? '0', 10)
}

function scheduleActiveNow(s: Schedule, now: Date): boolean {
  const { day, minutes } = localTimeParts(now)
  if (s.daysOfWeek && s.daysOfWeek.length > 0) {
    if (!s.daysOfWeek.map((d) => d.toLowerCase().slice(0, 3)).includes(day)) {
      return false
    }
  }
  const start = timeToMinutes(s.startTime)
  const end = timeToMinutes(s.endTime)
  if (start === end) return false
  if (start < end) return minutes >= start && minutes < end
  // Window wraps past midnight (e.g. 23:00 → 02:00).
  return minutes >= start || minutes < end
}

export class RadioState {
  tracks: Track[] = []
  playlists: Playlist[] = []
  schedules: Schedule[] = []

  /** documentIds of recently played tracks (most recent last). */
  private recent: string[] = []

  /** The schedule that was active on the previous scheduler tick. */
  activeScheduleId: string | null = null

  nowPlaying: NowPlayingPayload = { source: 'autodj' }

  async refresh(): Promise<void> {
    const [tracks, playlists, schedules] = await Promise.all([
      fetchEnabledTracks(),
      fetchPlaylists(),
      fetchSchedules(),
    ])
    this.tracks = tracks
    this.playlists = playlists
    this.schedules = schedules
  }

  /** Highest-priority schedule active right now, or null. */
  activeSchedule(now = new Date()): Schedule | null {
    const active = this.schedules
      .filter((s) => s.enabled !== false && scheduleActiveNow(s, now))
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    return active[0] ?? null
  }

  /** The track pool to draw from right now. */
  currentPool(now = new Date()): { source: string; tracks: Track[] } {
    const schedule = this.activeSchedule(now)
    if (schedule?.playlist?.tracks?.length) {
      return { source: 'scheduled', tracks: schedule.playlist.tracks }
    }
    const def = this.playlists.find(
      (p) => p.isDefault && p.tracks && p.tracks.length > 0,
    )
    if (def?.tracks?.length) return { source: 'autodj', tracks: def.tracks }
    return { source: 'autodj', tracks: this.tracks }
  }

  /** Weighted-random pick that avoids the recent window when possible. */
  pickNext(now = new Date()): { track: Track; source: string } | null {
    const { source, tracks } = this.currentPool(now)
    const playable = tracks.filter(
      (t) => t.enabled !== false && trackAudioUrl(t) !== null,
    )
    if (playable.length === 0) return null

    const fresh = playable.filter((t) => !this.recent.includes(t.documentId))
    const candidates = fresh.length > 0 ? fresh : playable

    const totalWeight = candidates.reduce(
      (sum, t) => sum + Math.max(1, t.weight ?? 1),
      0,
    )
    let r = Math.random() * totalWeight
    let chosen = candidates[0]
    for (const t of candidates) {
      r -= Math.max(1, t.weight ?? 1)
      if (r <= 0) {
        chosen = t
        break
      }
    }

    this.recent.push(chosen.documentId)
    if (this.recent.length > config.noRepeatWindow) this.recent.shift()

    return { track: chosen, source }
  }
}

/** Build a Liquidsoap annotate: request URI from a track. */
export function annotateUri(track: Track): string | null {
  const url = trackAudioUrl(track)
  if (!url) return null
  const esc = (s: string) => s.replace(/"/g, '\\"')
  const annotations = [
    `title="${esc(track.title ?? '')}"`,
    `artist="${esc(track.artist ?? '')}"`,
    `track_id="${esc(track.documentId)}"`,
  ].join(',')
  return `annotate:${annotations}:${url}`
}
