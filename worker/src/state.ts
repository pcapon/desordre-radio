import { config } from './config.js'
import {
  fetchEnabledTracks,
  trackAudioUrl,
  type NowPlayingPayload,
  type Track,
} from './strapi.js'

/** A track queued to interrupt the rotation, with the source to report for it. */
interface QueuedTrack {
  track: Track
  source: 'forced' | 'scheduled'
}

export class RadioState {
  /** All enabled+published tracks (rotation pool + scheduled tracks combined). */
  tracks: Track[] = []

  /** Tracks queued to play before the normal rotation (play-now + scheduled). */
  private queue: QueuedTrack[] = []

  /** documentIds of recently played tracks (most recent last). */
  private recent: string[] = []

  /**
   * Keys (`documentId@scheduledAt`) of scheduled tracks already fired, so a
   * given airing fires exactly once. Bounded by pruning past the grace window.
   */
  private firedScheduled = new Map<string, number>()

  nowPlaying: NowPlayingPayload = { source: 'autodj' }

  async refresh(): Promise<void> {
    this.tracks = await fetchEnabledTracks()
  }

  private rememberRecent(track: Track): void {
    this.recent.push(track.documentId)
    if (this.recent.length > config.noRepeatWindow) this.recent.shift()
  }

  private isPlayable(track: Track): boolean {
    return track.enabled !== false && trackAudioUrl(track) !== null
  }

  /** Rotation pool: enabled tracks that are not pinned to a specific time. */
  private rotationTracks(): Track[] {
    return this.tracks.filter((t) => !t.scheduledAt)
  }

  /** Tracks pinned to a specific air time. */
  scheduledTracks(): Track[] {
    return this.tracks.filter((t) => Boolean(t.scheduledAt))
  }

  findTrackByDocumentId(documentId: string): Track | null {
    return this.tracks.find((t) => t.documentId === documentId) ?? null
  }

  /** Queue a track to play immediately before the rotation resumes. */
  queueTrack(track: Track, source: 'forced' | 'scheduled' = 'forced'): number {
    this.queue.push({ track, source })
    return this.queue.length
  }

  forcedQueueLength(): number {
    return this.queue.length
  }

  private dequeue(): QueuedTrack | null {
    while (this.queue.length > 0) {
      const next = this.queue.shift()
      if (next && this.isPlayable(next.track)) return next
    }
    return null
  }

  /**
   * Scheduled tracks whose time has arrived (within the grace window) and which
   * have not fired yet. Marks them fired so each airing is picked up once.
   */
  dueScheduled(now = new Date()): Track[] {
    const nowMs = now.getTime()
    const due: Track[] = []

    for (const track of this.scheduledTracks()) {
      if (!track.scheduledAt) continue
      const at = new Date(track.scheduledAt).getTime()
      if (Number.isNaN(at)) continue
      if (at > nowMs) continue // not yet
      if (nowMs - at > config.scheduleGraceMs) continue // too old (missed/stale)

      const key = `${track.documentId}@${track.scheduledAt}`
      if (this.firedScheduled.has(key)) continue
      this.firedScheduled.set(key, nowMs)
      due.push(track)
    }

    this.pruneFired(nowMs)
    return due
  }

  private pruneFired(nowMs: number): void {
    for (const [key, firedAt] of this.firedScheduled) {
      if (nowMs - firedAt > config.scheduleGraceMs) this.firedScheduled.delete(key)
    }
  }

  /** The track pool the rotation draws from right now. */
  currentPool(): { source: string; tracks: Track[] } {
    return { source: 'autodj', tracks: this.rotationTracks() }
  }

  /** Weighted-random pick that avoids the recent window when possible. */
  pickNext(): { track: Track; source: string } | null {
    const queued = this.dequeue()
    if (queued) {
      this.rememberRecent(queued.track)
      return { track: queued.track, source: queued.source }
    }

    const { source, tracks } = this.currentPool()
    const playable = tracks.filter((track) => this.isPlayable(track))
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

    this.rememberRecent(chosen)

    return { track: chosen, source }
  }
}

/**
 * Build a Liquidsoap annotate: request URI from a track. When `source` is
 * given (forced/scheduled), it is attached as `liq_source` so Liquidsoap can
 * report the correct now-playing source instead of the default "autodj".
 */
export function annotateUri(track: Track, source?: string): string | null {
  const url = trackAudioUrl(track)
  if (!url) return null
  const esc = (s: string) => s.replace(/"/g, '\\"')
  const annotations = [
    `title="${esc(track.title ?? '')}"`,
    `artist="${esc(track.artist ?? '')}"`,
    `track_id="${esc(track.documentId)}"`,
  ]
  if (source) annotations.push(`liq_source="${esc(source)}"`)
  if (track.show?.title) annotations.push(`show="${esc(track.show.title)}"`)
  return `annotate:${annotations.join(',')}:${url}`
}
