import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'

/**
 * A unit of audio the player can play. Either the live radio stream or an
 * on-demand replay episode. The shape is intentionally decoupled from Strapi
 * so the player works with sample data, the live stream env var, or the CMS.
 */
export type PlayerTrack = {
  /** Stable id used to detect "is this the currently loaded track". */
  id: string
  kind: 'live' | 'episode'
  title: string
  subtitle?: string
  /** Audio source URL (stream manifest, mp3, etc.). */
  src: string
  artworkUrl?: string | null
  /** Optional internal link back to the episode/show page. */
  href?: string
}

type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error'

type PlayerContextValue = {
  track: PlayerTrack | null
  status: PlayerStatus
  isPlaying: boolean
  /** Live streams report no meaningful duration. */
  isLive: boolean
  currentTime: number
  duration: number
  volume: number
  muted: boolean
  /** Load a track and start playing it. */
  play: (track: PlayerTrack) => void
  /** Toggle play/pause on the currently loaded track. */
  toggle: () => void
  pause: () => void
  resume: () => void
  seek: (seconds: number) => void
  setVolume: (value: number) => void
  toggleMuted: () => void
  /** True when `track.id` matches and it is actively playing. */
  isCurrent: (id: string) => boolean
}

const PlayerContext = createContext<PlayerContextValue | null>(null)

const VOLUME_STORAGE_KEY = 'desordre:volume'

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [track, setTrack] = useState<PlayerTrack | null>(null)
  const [status, setStatus] = useState<PlayerStatus>('idle')
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(0.8)
  const [muted, setMuted] = useState(false)

  // Restore persisted volume on the client only (avoids SSR mismatch).
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(VOLUME_STORAGE_KEY)
      if (stored !== null) {
        const parsed = Number(stored)
        if (!Number.isNaN(parsed)) setVolumeState(Math.min(1, Math.max(0, parsed)))
      }
    } catch {
      /* ignore */
    }
  }, [])

  // Keep the audio element's volume in sync with state.
  useEffect(() => {
    const audio = audioRef.current
    if (audio) {
      audio.volume = volume
      audio.muted = muted
    }
  }, [volume, muted])

  const play = useCallback((next: PlayerTrack) => {
    const audio = audioRef.current
    if (!audio) return

    const isSameSource = track?.id === next.id && audio.src.includes(next.src)
    if (!isSameSource) {
      setTrack(next)
      audio.src = next.src
      // Live streams must always (re)connect from the live edge.
      audio.load()
      setCurrentTime(0)
      setDuration(0)
    }
    setStatus('loading')
    void audio.play().catch(() => setStatus('error'))
  }, [track])

  const pause = useCallback(() => {
    audioRef.current?.pause()
  }, [])

  const resume = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !track) return
    void audio.play().catch(() => setStatus('error'))
  }, [track])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !track) return
    if (audio.paused) resume()
    else audio.pause()
  }, [track, resume])

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current
    if (!audio || track?.kind === 'live') return
    audio.currentTime = seconds
    setCurrentTime(seconds)
  }, [track])

  const setVolume = useCallback((value: number) => {
    const clamped = Math.min(1, Math.max(0, value))
    setVolumeState(clamped)
    if (clamped > 0) setMuted(false)
    try {
      window.localStorage.setItem(VOLUME_STORAGE_KEY, String(clamped))
    } catch {
      /* ignore */
    }
  }, [])

  const toggleMuted = useCallback(() => setMuted((m) => !m), [])

  const isCurrent = useCallback(
    (id: string) => track?.id === id && status === 'playing',
    [track, status],
  )

  const isLive = track?.kind === 'live'
  const isPlaying = status === 'playing' || status === 'loading'

  const value = useMemo<PlayerContextValue>(
    () => ({
      track,
      status,
      isPlaying,
      isLive,
      currentTime,
      duration,
      volume,
      muted,
      play,
      toggle,
      pause,
      resume,
      seek,
      setVolume,
      toggleMuted,
      isCurrent,
    }),
    [
      track,
      status,
      isPlaying,
      isLive,
      currentTime,
      duration,
      volume,
      muted,
      play,
      toggle,
      pause,
      resume,
      seek,
      setVolume,
      toggleMuted,
      isCurrent,
    ],
  )

  return (
    <PlayerContext.Provider value={value}>
      {children}
      {/* The single, app-wide audio element. Living in the provider (above the
          router Outlet) is what lets playback continue across route changes. */}
      <audio
        ref={audioRef}
        preload="none"
        onPlaying={() => setStatus('playing')}
        onPause={() => setStatus((s) => (s === 'error' ? s : 'paused'))}
        onWaiting={() => setStatus('loading')}
        onError={() => setStatus('error')}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration
          setDuration(Number.isFinite(d) ? d : 0)
        }}
        onEnded={() => setStatus('paused')}
      />
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) {
    throw new Error('usePlayer must be used within a <PlayerProvider>')
  }
  return ctx
}
