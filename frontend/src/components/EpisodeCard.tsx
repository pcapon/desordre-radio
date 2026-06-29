import { Link } from '@tanstack/react-router'
import { StrapiImage } from '@/components/strapi-image'
import { PlayEpisodeButton } from '@/components/PlayEpisodeButton'
import { formatDate, formatDuration } from '@/lib/format'
import type { TEpisode } from '@/types/strapi'

export function EpisodeCard({ episode }: { episode: TEpisode }) {
  const duration = formatDuration(episode.duration)
  const date = formatDate(episode.airedAt || episode.publishedAt)

  return (
    <Link
      to="/replay/$slug"
      params={{ slug: episode.slug }}
      className="content-card group"
    >
      <div className="content-card-media">
        <StrapiImage
          src={episode.cover?.url}
          alt={episode.cover?.alternativeText || episode.title}
        />
        <div className="content-card-fab">
          <PlayEpisodeButton episode={episode} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        {episode.show?.title && (
          <p className="eyebrow mb-2">{episode.show.title}</p>
        )}
        <h3 className="mb-2 text-lg font-semibold leading-snug text-[var(--sea-ink)]">
          {episode.title}
        </h3>
        {episode.description && (
          <p className="line-clamp-2 text-sm leading-relaxed text-[var(--sea-ink-soft)]">
            {episode.description}
          </p>
        )}
        <div className="mt-auto flex items-center gap-3 pt-4 text-xs text-[var(--sea-ink-soft)]">
          {date && <span>{date}</span>}
          {date && duration && <span aria-hidden="true">·</span>}
          {duration && <span>{duration}</span>}
        </div>
      </div>
    </Link>
  )
}
