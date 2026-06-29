import { Loader2, Pause, Play } from 'lucide-react'
import { usePlayer } from '@/lib/player/player-context'
import { episodeToTrack } from '@/data/sample'
import type { TEpisode } from '@/types/strapi'

interface PlayEpisodeButtonProps {
  episode: TEpisode
  /** "icon" = round icon button (cards); "full" = labelled pill (detail page). */
  variant?: 'icon' | 'full'
  className?: string
}

/**
 * Plays (or pauses) a given episode through the global player. Reflects the
 * live player state so a card shows "playing" while its episode is on air.
 */
export function PlayEpisodeButton({
  episode,
  variant = 'icon',
  className = '',
}: PlayEpisodeButtonProps) {
  const player = usePlayer()
  const track = episodeToTrack(episode)

  if (!track) return null

  const isThis = player.track?.id === track.id
  const isPlaying = isThis && player.isPlaying
  const isLoading = isThis && player.status === 'loading'

  const onClick = (e: React.MouseEvent) => {
    // These buttons frequently live inside <Link> cards.
    e.preventDefault()
    e.stopPropagation()
    if (isThis) player.toggle()
    else player.play(track)
  }

  const Icon = isLoading ? Loader2 : isPlaying ? Pause : Play
  const label = isPlaying ? 'Mettre en pause' : `Écouter ${episode.title}`

  if (variant === 'full') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`demo-button ${className}`}
        aria-label={label}
      >
        <Icon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
        {isPlaying ? 'En lecture' : 'Écouter le replay'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`play-fab ${isPlaying ? 'is-active' : ''} ${className}`}
      aria-label={label}
    >
      <Icon
        className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''} ${
          !isPlaying && !isLoading ? 'translate-x-[1px]' : ''
        }`}
      />
    </button>
  )
}
