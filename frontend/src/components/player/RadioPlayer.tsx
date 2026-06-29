import { Link } from '@tanstack/react-router'
import {
  Loader2,
  Pause,
  Play,
  Radio,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { usePlayer } from '@/lib/player/player-context'
import { LIVE_TRACK, STATION_NAME, formatTime } from '@/lib/player/radio-config'
import { useNowPlaying } from '@/lib/player/use-now-playing'
import { StrapiImage } from '@/components/strapi-image'

export function RadioPlayer() {
  const player = usePlayer()
  const { track, status, isPlaying, isLive, currentTime, duration } = player

  const hasTrack = track !== null
  const isLoading = status === 'loading'

  // While the live stream is on, poll the now-playing API for track metadata.
  const nowPlaying = useNowPlaying(isLive)
  const liveTitle =
    isLive && nowPlaying?.title ? nowPlaying.title : track?.title
  const liveSubtitle =
    isLive && (nowPlaying?.artist || nowPlaying?.show)
      ? [nowPlaying.artist, nowPlaying.show].filter(Boolean).join(' · ')
      : track?.subtitle

  // Primary button: when nothing is loaded yet, default to tuning in live.
  const onPrimary = () => {
    if (!hasTrack) {
      player.play(LIVE_TRACK)
      return
    }
    player.toggle()
  }

  const liveActive = isLive && isPlaying

  return (
    <div className="radio-player" role="region" aria-label="Radio player">
      <div className="radio-player-inner page-wrap">
        {/* Now playing */}
        <div className="radio-now flex min-w-0 items-center gap-3">
          <div className="radio-art">
            {track?.artworkUrl ? (
              <StrapiImage
                src={track.artworkUrl}
                alt={track.title}
                className="h-full w-full"
              />
            ) : (
              <span className="radio-art-fallback" aria-hidden="true">
                <Radio className="h-5 w-5" />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="radio-kicker">
              {isLive ? (
                <span className="radio-live">
                  <span className="radio-live-dot" /> En direct
                </span>
              ) : hasTrack ? (
                'Replay'
              ) : (
                STATION_NAME
              )}
            </p>
            {track?.href ? (
              <Link to={track.href} className="radio-title truncate">
                {liveTitle}
              </Link>
            ) : (
              <p className="radio-title truncate">
                {liveTitle ?? 'Appuyez pour écouter le direct'}
              </p>
            )}
            {liveSubtitle && (
              <p className="radio-subtitle truncate">{liveSubtitle}</p>
            )}
          </div>
        </div>

        {/* Transport + progress */}
        <div className="radio-center">
          <button
            type="button"
            onClick={onPrimary}
            className="radio-play"
            aria-label={isPlaying ? 'Pause' : 'Lecture'}
          >
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6 translate-x-[1px]" />
            )}
          </button>

          {isLive || !hasTrack ? (
            <div className="radio-progress-live">
              <span className="radio-time">{liveActive ? 'LIVE' : '—'}</span>
              <div className="radio-bar radio-bar-live" aria-hidden="true">
                <span className={liveActive ? 'radio-equalizer' : undefined} />
              </div>
            </div>
          ) : (
            <div className="radio-progress">
              <span className="radio-time tabular-nums">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                className="radio-seek"
                min={0}
                max={duration || 0}
                step={1}
                value={Math.min(currentTime, duration || 0)}
                onChange={(e) => player.seek(Number(e.target.value))}
                aria-label="Position de lecture"
              />
              <span className="radio-time tabular-nums">
                {formatTime(duration)}
              </span>
            </div>
          )}
        </div>

        {/* Live shortcut + volume */}
        <div className="radio-right">
          <button
            type="button"
            onClick={() => player.play(LIVE_TRACK)}
            className={`radio-live-btn ${liveActive ? 'is-active' : ''}`}
            aria-pressed={liveActive}
          >
            <Radio className="h-4 w-4" />
            <span className="hidden sm:inline">Direct</span>
          </button>

          <div className="radio-volume">
            <button
              type="button"
              onClick={player.toggleMuted}
              className="radio-icon-btn"
              aria-label={player.muted ? 'Réactiver le son' : 'Couper le son'}
            >
              <VolumeIcon muted={player.muted} volume={player.volume} />
            </button>
            <input
              type="range"
              className="radio-volume-range"
              min={0}
              max={1}
              step={0.01}
              value={player.muted ? 0 : player.volume}
              onChange={(e) => player.setVolume(Number(e.target.value))}
              aria-label="Volume"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function VolumeIcon({ muted, volume }: { muted: boolean; volume: number }) {
  if (muted || volume === 0) return <VolumeX className="h-5 w-5" />
  if (volume < 0.5) return <Volume1 className="h-5 w-5" />
  return <Volume2 className="h-5 w-5" />
}
