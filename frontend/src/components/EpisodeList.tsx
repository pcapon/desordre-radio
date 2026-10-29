import { useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { SlicedImage } from '@/components/SlicedImage'
import { PlayEpisodeButton } from '@/components/PlayEpisodeButton'
import { usePlayer } from '@/lib/player/player-context'
import { formatDate, formatDuration } from '@/lib/format'
import type { TEpisode } from '@/types/strapi'

/**
 * Episodes as a tracklist: date, show + title, duration, play. On fine
 * pointers the hovered episode's cover floats next to the cursor.
 */
export function EpisodeList({ episodes }: { episodes: Array<TEpisode> }) {
  const player = usePlayer()
  const previewRef = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState<TEpisode | null>(null)

  const onMove = (e: React.MouseEvent) => {
    const el = previewRef.current
    if (!el) return
    el.style.setProperty('--x', `${e.clientX + 24}px`)
    el.style.setProperty('--y', `${e.clientY - 170}px`)
  }

  return (
    <div onMouseMove={onMove} onMouseLeave={() => setHovered(null)}>
      <ul className="tracklist">
        {episodes.map((episode) => {
          const date = formatDate(episode.airedAt || episode.publishedAt)
          const duration = formatDuration(episode.duration)
          const playing =
            player.track?.id === `episode:${episode.documentId}` &&
            player.isPlaying

          return (
            <li
              key={episode.documentId}
              className="tl-row"
              data-playing={playing}
              onMouseEnter={() => setHovered(episode)}
            >
              <Link
                to="/replay/$slug"
                params={{ slug: episode.slug }}
                className="tl-link"
              >
                <span className="tl-date">{date}</span>
                <span className="min-w-0">
                  {episode.show?.title && (
                    <span className="tl-show">{episode.show.title}</span>
                  )}
                  <span className="tl-title">{episode.title}</span>
                </span>
                <span className="tl-dur">{duration}</span>
              </Link>
              <PlayEpisodeButton episode={episode} />
            </li>
          )
        })}
      </ul>

      <div
        ref={previewRef}
        className="tl-preview"
        data-visible={Boolean(hovered?.cover?.url)}
        aria-hidden="true"
      >
        {hovered?.cover?.url && (
          // Keyed so each newly hovered episode replays the settle animation.
          <SlicedImage
            key={hovered.documentId}
            src={hovered.cover.url}
            mode="intro"
            slices={4}
          />
        )}
      </div>
    </div>
  )
}
