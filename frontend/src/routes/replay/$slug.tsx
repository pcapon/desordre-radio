import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { strapiApi } from '@/data/loaders'
import { sampleEpisodes } from '@/data/sample'
import { SlicedImage } from '@/components/SlicedImage'
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
    <main className="page-wrap py-16">
      <h1 className="display-title mb-4 text-5xl">Épisode introuvable</h1>
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
    <main className="page-wrap pb-16 pt-8">
      <Link to="/replay" className="section-link inline-flex items-center gap-2">
        <ArrowLeft className="h-4 w-4" /> Replay
      </Link>

      <article className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
        <div className="slice-host">
          <SlicedImage
            src={episode.cover?.url}
            alt={episode.cover?.alternativeText || episode.title}
            slices={6}
            className="aspect-square w-full"
          />
        </div>

        <div className="min-w-0">
          {episode.show?.title && (
            <p className="eyebrow mb-3">{episode.show.title}</p>
          )}
          <h1 className="display-title mb-6 text-[clamp(2.6rem,5.5vw,5rem)]">
            {episode.title}
          </h1>

          <dl className="mb-8 flex flex-wrap gap-x-8 gap-y-2 border-y border-[var(--line)] py-3 text-sm text-[var(--fg-soft)]">
            {date && (
              <div className="flex gap-2">
                <dt>Diffusé le</dt>
                <dd className="m-0 text-[var(--ink)]">{date}</dd>
              </div>
            )}
            {duration && (
              <div className="flex gap-2">
                <dt>Durée</dt>
                <dd className="m-0 text-[var(--ink)]">{duration}</dd>
              </div>
            )}
          </dl>

          <div className="mb-10">
            <PlayEpisodeButton episode={episode} variant="full" />
          </div>

          {episode.description && (
            <p className="mb-8 max-w-[52ch] text-xl leading-snug tracking-[-0.02em]">
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
