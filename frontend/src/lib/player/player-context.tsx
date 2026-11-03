import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import {
  WIDGET_HEIGHT,
  WIDGET_OPTIONS,
  loadSoundCloudApi,
  widgetSrc,
} from './soundcloud'
import type { SCWidget } from './soundcloud'

/**
 * A unit of audio the player can play: the live radio stream (an `<audio>`
 * element) or a replay episode (a SoundCloud track, played through the
 * SoundCloud widget). The shape is decoupled from Strapi.
 */
export type PlayerTrack = {
  /** Stable id used to detect "is this the currently loaded track". */
  id: string
  kind: 'live' | 'episode'
  title: string
  subtitle?: string
  /** Stream URL for live, SoundCloud track URL for episodes. */
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
  /** Id of the episode loaded in the SoundCloud widget, if any. */
  widgetTrackId: string | null
  /**
   * Show the SoundCloud widget over `el` (an episode page's embed slot).
   * Returns a detach function. See the widget section below.
   */
  attachEmbedSlot: (el: HTMLElement, track: PlayerTrack) => () => void
}

const PlayerContext = createContext<PlayerContextValue | null>(null)

const VOLUME_STORAGE_KEY = 'desordre:volume'

const usesWidget = (track: PlayerTrack | null) => track?.kind === 'episode'

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [track, setTrackState] = useState<PlayerTrack | null>(null)
  const [status, setStatusState] = useState<PlayerStatus>('idle')
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(0.8)
  const [muted, setMuted] = useState(false)

  // Mirrors for event handlers bound once (audio + widget listeners).
  const trackRef = useRef<PlayerTrack | null>(null)
  const statusRef = useRef<PlayerStatus>('idle')
  const volumeRef = useRef({ volume, muted })
  volumeRef.current = { volume, muted }

  const setTrack = useCallback((next: PlayerTrack | null) => {
    trackRef.current = next
    setTrackState(next)
  }, [])
  const setStatus = useCallback((next: PlayerStatus) => {
    statusRef.current = next
    setStatusState(next)
  }, [])

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

  /* ------------------------------------------------------------------ */
  /* SoundCloud widget                                                   */
  /*                                                                     */
  /* One iframe, created on first need and never unmounted or moved in   */
  /* the DOM (that would reload it and cut playback). It sits offscreen  */
  /* while hidden; on an episode page it is positioned over the page's   */
  /* embed slot, so the visitor sees the real SoundCloud player and the  */
  /* dock drives the same instance.                                      */
  /* ------------------------------------------------------------------ */

  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const hostRef = useRef<HTMLDivElement | null>(null)
  const widgetRef = useRef<SCWidget | null>(null)
  const [iframeSrc, setIframeSrc] = useState<string | null>(null)
  /** Episode loaded in the widget (playing or cued). */
  const widgetTrackRef = useRef<PlayerTrack | null>(null)
  const [widgetTrackId, setWidgetTrackId] = useState<string | null>(null)
  /** Play once the widget is ready (first load only). */
  const autoPlayRef = useRef(false)

  const applyWidgetVolume = useCallback(() => {
    const { volume: v, muted: m } = volumeRef.current
    widgetRef.current?.setVolume(m ? 0 : Math.round(v * 100))
  }, [])

  /** Load an episode into the widget, optionally starting it. */
  const loadInWidget = useCallback(
    (next: PlayerTrack, autoPlay: boolean) => {
      widgetTrackRef.current = next
      setWidgetTrackId(next.id)
      const widget = widgetRef.current
      if (!widget) {
        // First use: the iframe mounts with this track, the effect below
        // binds the widget once it exists.
        autoPlayRef.current = autoPlay
        setIframeSrc(widgetSrc(next.src, false))
        return
      }
      widget.load(next.src, {
        ...WIDGET_OPTIONS,
        auto_play: false,
        callback: () => {
          applyWidgetVolume()
          if (autoPlay) widget.play()
        },
      })
    },
    [applyWidgetVolume],
  )

  // Bind the widget once its iframe exists. Listeners survive `load()`.
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframeSrc || !iframe || widgetRef.current) return
    let cancelled = false
    loadSoundCloudApi()
      .then((SC) => {
        if (cancelled) return
        const widget = SC.Widget(iframe)
        const isWidgetTrackCurrent = () =>
          trackRef.current !== null &&
          trackRef.current.id === widgetTrackRef.current?.id

        widget.bind('ready', () => {
          widgetRef.current = widget
          applyWidgetVolume()
          if (autoPlayRef.current) {
            autoPlayRef.current = false
            widget.play()
          }
        })
        widget.bind('play', () => {
          // Started from the dock, or from a click inside the embed: either
          // way the widget's episode becomes the dock's track.
          const cued = widgetTrackRef.current
          if (!cued) return
          if (trackRef.current?.id !== cued.id) {
            setTrack(cued)
            setCurrentTime(0)
            setDuration(0)
          }
          audioRef.current?.pause()
          setStatus('playing')
          widget.getDuration((ms) => setDuration(ms / 1000))
        })
        widget.bind('pause', () => {
          if (isWidgetTrackCurrent()) setStatus('paused')
        })
        widget.bind('finish', () => {
          if (isWidgetTrackCurrent()) setStatus('paused')
        })
        widget.bind('playProgress', (e) => {
          if (e && isWidgetTrackCurrent()) setCurrentTime(e.currentPosition / 1000)
        })
        widget.bind('error', () => {
          if (isWidgetTrackCurrent()) setStatus('error')
        })
      })
      .catch(() => {
        if (usesWidget(trackRef.current)) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [iframeSrc, applyWidgetVolume, setStatus, setTrack])

  // Embed slot: where (if anywhere) the widget is shown on the page.
  const [slot, setSlot] = useState<{ el: HTMLElement; track: PlayerTrack } | null>(
    null,
  )

  const attachEmbedSlot = useCallback(
    (el: HTMLElement, slotTrack: PlayerTrack) => {
      setSlot({ el, track: slotTrack })
      return () => setSlot((s) => (s?.el === el ? null : s))
    },
    [],
  )

  // Cue the slot's episode, unless another episode is playing right now:
  // then the page shows a fallback and we never cut what the visitor hears.
  useEffect(() => {
    if (!slot) return
    if (widgetTrackRef.current?.id === slot.track.id) return
    const busy =
      usesWidget(trackRef.current) &&
      (statusRef.current === 'playing' || statusRef.current === 'loading')
    if (!busy) loadInWidget(slot.track, false)
  }, [slot, loadInWidget])

  // Position the host over the slot (document coordinates, so scrolling
  // needs no work), or park it offscreen.
  const visibleSlot = slot && widgetTrackId === slot.track.id ? slot.el : null
  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return
    if (!visibleSlot) {
      Object.assign(host.style, {
        position: 'fixed',
        top: '0px',
        left: '-10000px',
        width: '400px',
        height: `${WIDGET_HEIGHT}px`,
        pointerEvents: 'none',
      })
      host.setAttribute('aria-hidden', 'true')
      iframeRef.current?.setAttribute('tabindex', '-1')
      return
    }
    const place = () => {
      const r = visibleSlot.getBoundingClientRect()
      Object.assign(host.style, {
        position: 'absolute',
        top: `${r.top + window.scrollY}px`,
        left: `${r.left + window.scrollX}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
        pointerEvents: 'auto',
      })
    }
    place()
    host.removeAttribute('aria-hidden')
    iframeRef.current?.removeAttribute('tabindex')
    const observer = new ResizeObserver(place)
    observer.observe(visibleSlot)
    observer.observe(document.body)
    window.addEventListener('resize', place)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', place)
    }
  }, [visibleSlot, iframeSrc])

  /* ------------------------------------------------------------------ */
  /* Transport                                                           */
  /* ------------------------------------------------------------------ */

  // Keep both engines' volume in sync with state.
  useEffect(() => {
    const audio = audioRef.current
    if (audio) {
      audio.volume = volume
      audio.muted = muted
    }
    applyWidgetVolume()
  }, [volume, muted, applyWidgetVolume])

  const play = useCallback(
    (next: PlayerTrack) => {
      const audio = audioRef.current
      const isNew = trackRef.current?.id !== next.id
      if (isNew) {
        setTrack(next)
        setCurrentTime(0)
        setDuration(0)
      }
      setStatus('loading')

      if (usesWidget(next)) {
        audio?.pause()
        if (widgetTrackRef.current?.id === next.id && widgetRef.current) {
          widgetRef.current.play()
        } else {
          loadInWidget(next, true)
        }
        return
      }

      if (!audio) return
      widgetRef.current?.pause()
      if (isNew || !audio.src.includes(next.src)) {
        audio.src = next.src
        // Live streams must always (re)connect from the live edge.
        audio.load()
      }
      void audio.play().catch(() => setStatus('error'))
    },
    [loadInWidget, setStatus, setTrack],
  )

  const pause = useCallback(() => {
    if (usesWidget(trackRef.current)) {
      widgetRef.current?.pause()
      // The widget only reports PAUSE once it was actually playing.
      setStatus('paused')
    } else audioRef.current?.pause()
  }, [setStatus])

  const resume = useCallback(() => {
    const current = trackRef.current
    if (current) play(current)
  }, [play])

  const toggle = useCallback(() => {
    if (!trackRef.current) return
    const s = statusRef.current
    if (s === 'playing' || s === 'loading') pause()
    else resume()
  }, [pause, resume])

  const seek = useCallback((seconds: number) => {
    const current = trackRef.current
    if (!current || current.kind === 'live') return
    if (usesWidget(current)) widgetRef.current?.seekTo(seconds * 1000)
    else if (audioRef.current) audioRef.current.currentTime = seconds
    setCurrentTime(seconds)
  }, [])

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

  // `<audio>` events only matter while the live stream is the current track
  // (pausing it to start a replay must not mark the replay as paused).
  const audioEvent = (next: PlayerStatus | ((s: PlayerStatus) => PlayerStatus)) =>
    () => {
      if (trackRef.current?.kind !== 'live') return
      setStatus(typeof next === 'function' ? next(statusRef.current) : next)
    }

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
      widgetTrackId,
      attachEmbedSlot,
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
      widgetTrackId,
      attachEmbedSlot,
    ],
  )

  return (
    <PlayerContext.Provider value={value}>
      {children}
      {/* The single, app-wide audio element for the live stream. Living in
          the provider (above the router Outlet) is what lets playback
          continue across route changes. */}
      <audio
        ref={audioRef}
        preload="none"
        onPlaying={audioEvent('playing')}
        onPause={audioEvent((s) => (s === 'error' ? s : 'paused'))}
        onWaiting={audioEvent('loading')}
        onError={audioEvent('error')}
        onEnded={audioEvent('paused')}
      />
      {/* The single SoundCloud widget for replays (see above). */}
      <div ref={hostRef} style={{ position: 'fixed', left: '-10000px' }}>
        {iframeSrc && (
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            title="Lecteur SoundCloud"
            allow="autoplay; encrypted-media"
            width="100%"
            height={WIDGET_HEIGHT}
            className="block border-0"
          />
        )}
      </div>
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
