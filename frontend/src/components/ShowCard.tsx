import { Link } from '@tanstack/react-router'
import { SlicedImage } from '@/components/SlicedImage'
import { NextSlot } from '@/components/NextSlot'
import { formatDate } from '@/lib/format'
import type { TShow } from '@/types/strapi'
import cardStyles from './ContentCard.module.css'
import { m } from '#/paraglide/messages'

export function ShowCard({ show, seed = 0 }: { show: TShow; seed?: number }) {
  const lastAired = formatDate(show.lastAiredAt)

  return (
    <Link
      to="/emissions/$slug"
      params={{ slug: show.slug }}
      className={`${cardStyles.card} slice-host`}
    >
      <div className={cardStyles.media}>
        <SlicedImage
          src={show.cover?.url}
          alt={show.cover?.alternativeText || show.title}
          seed={seed}
          className="h-full w-full"
        />
      </div>
      {show.schedule && <p className="eyebrow mt-4 mb-0">{show.schedule}</p>}
      <h3 className={cardStyles.title}>{show.title}</h3>
      {show.description && (
        <p className="line-clamp-3 text-[0.95rem] leading-relaxed text-[var(--fg-soft)]">
          {show.description}
        </p>
      )}
      <div className="mt-auto pt-3 text-sm">
        {show.host && <p className="m-0">{m.show_with({ host: show.host })}</p>}
        {lastAired && (
          <p className="m-0 mt-1 text-[var(--fg-soft)]">
            {m.show_last_aired({ date: lastAired })}
          </p>
        )}
        <NextSlot show={show} />
      </div>
    </Link>
  )
}
