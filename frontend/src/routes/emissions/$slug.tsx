import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { strapiApi } from '@/data/loaders'
import { SlicedImage } from '@/components/SlicedImage'
import { EpisodeList } from '@/components/EpisodeList'
import { NextSlot } from '@/components/NextSlot'
import { Pagination } from '@/components/pagination'
import type { TEpisode, TShow } from '@/types/strapi'
import { m } from '#/paraglide/messages'

// Absent page = 1, so a bare /emissions/<slug> URL is never rewritten.
type ShowSearch = { page?: number }

function validateSearch(input: Record<string, unknown>): ShowSearch {
  const page = Number(input.page)
  return Number.isFinite(page) && page > 1 ? { page } : {}
}

type LoaderResult = {
  show: TShow
  episodes: Array<TEpisode>
  total: number
  pageCount: number
}

export const Route = createFileRoute('/emissions/$slug')({
  component: ShowDetail,
  notFoundComponent: ShowNotFound,
  validateSearch,
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ params, deps }): Promise<LoaderResult> => {
    const [showRes, episodesRes] = await Promise.all([
      strapiApi.shows.getShowBySlugData({ data: params.slug }),
      strapiApi.episodes.getEpisodesData({
        data: { show: params.slug, page: deps.page },
      }),
    ])
    const show = showRes.data?.[0]
    if (!show) throw notFound()
    return {
      show,
      episodes: episodesRes.data ?? [],
      total: episodesRes.meta?.pagination?.total ?? 0,
      pageCount: episodesRes.meta?.pagination?.pageCount ?? 1,
    }
  },
})

function ShowNotFound() {
  return (
    <main className="page-wrap py-16">
      <h1 className="display-title mb-4 text-5xl">{m.show_not_found_title()}</h1>
      <p className="demo-muted mb-6">
        {m.show_not_found_text()}
      </p>
      <Link to="/emissions" className="demo-button demo-button-secondary">
        {m.shows_all()}
      </Link>
    </main>
  )
}

function ShowDetail() {
  const { show, episodes, total, pageCount } = Route.useLoaderData()

  return (
    <main className="page-wrap pb-16 pt-8">
      <Link to="/emissions" className="section-link inline-flex items-center gap-2">
        <ArrowLeft className="h-4 w-4" /> {m.nav_shows()}
      </Link>

      <article className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
        <div className="slice-host">
          <SlicedImage
            src={show.cover?.url}
            alt={show.cover?.alternativeText || show.title}
            slices={6}
            className="aspect-square w-full"
          />
        </div>

        <div className="min-w-0">
          <p className="eyebrow mb-3">{m.show_eyebrow()}</p>
          <h1 className="display-title mb-6 text-[clamp(2.6rem,5.5vw,5rem)]">
            {show.title}
          </h1>

          {(show.host || show.schedule) && (
            <dl className="mb-8 flex flex-wrap gap-x-8 gap-y-2 border-y border-[var(--line)] py-3 text-sm text-[var(--fg-soft)]">
              {show.host && (
                <div className="flex gap-2">
                  <dt>{m.show_host_label()}</dt>
                  <dd className="m-0 text-[var(--ink)]">{show.host}</dd>
                </div>
              )}
              {show.schedule && (
                <div className="flex gap-2">
                  <dt>{m.show_schedule_label()}</dt>
                  <dd className="m-0 text-[var(--ink)]">{show.schedule}</dd>
                </div>
              )}
            </dl>
          )}

          {show.description && (
            <p className="mb-10 max-w-[52ch] text-xl leading-snug tracking-[-0.02em]">
              {show.description}
            </p>
          )}

          <div className="max-w-md">
            <NextSlot show={show} variant="full" />
          </div>
        </div>
      </article>

      <section className="mt-24 sm:mt-32">
        <div className="section-head">
          <h2 className="section-title">
            {m.show_replays()}<sup>{String(total).padStart(2, '0')}</sup>
          </h2>
        </div>
        {episodes.length === 0 ? (
          <p className="demo-muted py-10">
            {m.show_no_replays()}
          </p>
        ) : (
          <>
            <EpisodeList episodes={episodes} hideShow />
            {pageCount > 1 && (
              <div className="mt-10">
                <Pagination pageCount={pageCount} />
              </div>
            )}
          </>
        )}
      </section>
    </main>
  )
}
