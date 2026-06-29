import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { ArrowLeft, CalendarDays, Clock } from 'lucide-react'
import { strapiApi } from '@/data/loaders'
import { sampleEpisodes } from '@/data/sample'
import { StrapiImage } from '@/components/strapi-image'
import { PlayEpisodeButton } from '@/components/PlayEpisodeButton'
import { BlockRenderer } from '@/components/blocks'
import { formatDate, formatDuration } from '@/lib/format'
import type { TEpisode } from '@/types/strapi'

export const Route = createFileRoute('/replay/$slug')({
  component: EpisodeDetail,
  notFoundComponent: EpisodeNotFound,
  loader: async ({ params }): Promise<{ episode: TEpisode }> => {
    try {
      const res = await strapiApi.episodes.getEpisodeBySlugData({
        data: params.slug,
      })
      if (res.data?.length) return { episode: res.data[0] }
    } catch (error) {
      console.error('Strapi episode fetch failed, trying sample data:', error)
    }

    const sample = sampleEpisodes.find((e) => e.slug === params.slug)
    if (sample) return { episode: sample }

    throw notFound()
  },
})

function EpisodeNotFound() {
  return (
    <main className="page-wrap px-4 py-16 text-center">
      <h1 className="display-title mb-3 text-3xl font-bold">Épisode introuvable</h1>
      <p className="demo-muted mb-6">
        Cet épisode n’existe pas ou n’est plus disponible.
      </p>
      <Link to="/replay" className="demo-button demo-button-secondary">
        Retour au replay
      </Link>
    </main>
  )
}

function EpisodeDetail() {
  const { episode } = Route.useLoaderData()
  const duration = formatDuration(episode.duration)
  const date = formatDate(episode.airedAt || episode.publishedAt)

  return (
    <main className="page-wrap px-4 pb-16 pt-8">
      <Link
        to="/replay"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold no-underline"
      >
        <ArrowLeft className="h-4 w-4" /> Replay
      </Link>

      <article className="demo-panel overflow-hidden p-0">
        <div className="relative aspect-[21/9] w-full overflow-hidden bg-[color-mix(in_oklab,var(--lagoon)_12%,var(--surface-strong))]">
          <StrapiImage
            src={episode.cover?.url}
            alt={episode.cover?.alternativeText || episode.title}
            className="h-full w-full"
          />
        </div>

        <div className="p-6 sm:p-10">
          {episode.show?.title && (
            <p className="eyebrow mb-2">{episode.show.title}</p>
          )}
          <h1 className="display-title mb-4 text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
            {episode.title}
          </h1>

          <div className="mb-6 flex flex-wrap items-center gap-4 text-sm text-[var(--sea-ink-soft)]">
            {date && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" /> {date}
              </span>
            )}
            {duration && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> {duration}
              </span>
            )}
          </div>

          <div className="mb-8">
            <PlayEpisodeButton episode={episode} variant="full" />
          </div>

          {episode.description && (
            <p className="mb-8 max-w-[68ch] text-lg leading-relaxed text-[var(--sea-ink-soft)]">
              {episode.description}
            </p>
          )}

          {episode.blocks && episode.blocks.length > 0 && (
            <div className="prose-editorial read-measure ml-0">
              <BlockRenderer blocks={episode.blocks} />
            </div>
          )}
        </div>
      </article>
    </main>
  )
}
