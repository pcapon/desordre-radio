import { useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { SlicedImage } from '@/components/SlicedImage'
import { PlayEpisodeButton } from '@/components/PlayEpisodeButton'
import { usePlayer } from '@/lib/player/player-context'
import { formatDate, formatDuration } from '@/lib/format'
import type { TEpisode } from '@/types/strapi'
import styles from './EpisodeList.module.css'

/**
 * Episodes as a tracklist: date, show + title, duration, play. On fine
 * pointers the hovered episode's cover floats next to the cursor.
 */
export function EpisodeList({
  episodes,
  hideShow = false,
}: {
  episodes: Array<TEpisode>
  /** Leave out the show name (e.g. on that show's own page). */
  hideShow?: boolean
}) {
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
      <ul className={styles.list}>
        {episodes.map((episode) => {
          const date = formatDate(episode.airedAt || episode.publishedAt)
          const duration = formatDuration(episode.duration)
          const playing =
            player.track?.id === `episode:${episode.documentId}` &&
            player.isPlaying

          return (
            <li
              key={episode.documentId}
              className={styles.row}
              data-playing={playing}
              onMouseEnter={() => setHovered(episode)}
            >
              <Link
                to="/replay/$slug"
                params={{ slug: episode.slug }}
                className={styles.link}
              >
                <span className={styles.date}>{date}</span>
                <span className="min-w-0">
                  {!hideShow && episode.show?.title && (
                    <span className={styles.show}>{episode.show.title}</span>
                  )}
                  <span className={styles.title}>{episode.title}</span>
                </span>
                <span className={styles.duration}>{duration}</span>
              </Link>
              <PlayEpisodeButton episode={episode} />
            </li>
          )
        })}
      </ul>

      <div
        ref={previewRef}
        className={styles.preview}
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
            className="h-full"
          />
        )}
      </div>
    </div>
  )
}
