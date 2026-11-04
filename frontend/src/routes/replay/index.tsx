import { createFileRoute } from '@tanstack/react-router'
import { strapiApi } from '@/data/loaders'
import { EpisodeList } from '@/components/EpisodeList'
import { Search } from '@/components/search'
import { ReplayFilters } from '@/components/ReplayFilters'
import { Pagination } from '@/components/pagination'
import { formatDate, stationTimeToDate } from '@/lib/format'
import type { TEpisode } from '@/types/strapi'

// Only emit params that are actually present so a bare /replay URL is not
// rewritten to /replay?page=1 (which would 307-redirect). Absent page = 1.
type ReplaySearch = {
  query?: string
  page?: number
  /** Air day, "YYYY-MM-DD" (station time zone). */
  date?: string
  /** Air time, "HH:MM" (station time zone); ignored without `date`. */
  time?: string
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

function validateSearch(input: Record<string, unknown>): ReplaySearch {
  const out: ReplaySearch = {}
  if (typeof input.query === 'string' && input.query) out.query = input.query
  if (typeof input.date === 'string' && DATE_RE.test(input.date)) {
    out.date = input.date
    if (typeof input.time === 'string' && TIME_RE.test(input.time)) {
      out.time = input.time
    }
  }
  const page = Number(input.page)
  if (Number.isFinite(page) && page > 1) out.page = page
  return out
}

type LoaderResult = {
  episodes: Array<TEpisode>
  pageCount: number
  query?: string
  date?: string
  time?: string
}

export const Route = createFileRoute('/replay/')({
  component: ReplayPage,
  validateSearch,
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ deps }): Promise<LoaderResult> => {
    const { query, page, date, time } = deps.search
    const res = await strapiApi.episodes.getEpisodesData({
      data: { query, page, date, time },
    })
    return {
      episodes: res.data ?? [],
      pageCount: res.meta?.pagination?.pageCount ?? 1,
      query,
      date,
      time,
    }
  },
})

function ReplayPage() {
  const { episodes, pageCount, query, date, time } = Route.useLoaderData()

  return (
    <main className="page-wrap pb-16 pt-10 sm:pt-16">
      <header className="mb-10 grid gap-6 lg:grid-cols-[1fr_minmax(0,28rem)] lg:items-end">
        <h1 className="section-title text-[clamp(4rem,14vw,12rem)]">Replay</h1>
        <p className="m-0 text-lg leading-snug text-[var(--fg-soft)]">
          Les émissions passées, à réécouter quand vous voulez. Le son continue
          dans le player pendant que vous naviguez.
        </p>
      </header>

      <div className="mb-10 max-w-xl">
        <Search placeholder="Chercher un épisode…" />
        <ReplayFilters date={date} time={time} />
      </div>

      {episodes.length === 0 ? (
        <div className="border-t border-[var(--line)] py-10">
          <h2 className="display-title mb-3 text-3xl">Aucun résultat</h2>
          <p className="demo-muted">
            {emptyMessage({ query, date, time })}
          </p>
        </div>
      ) : (
        <>
          <div className="border-t border-[var(--line)]">
            <EpisodeList episodes={episodes} />
          </div>
          {pageCount > 1 && (
            <div className="mt-10">
              <Pagination pageCount={pageCount} />
            </div>
          )}
        </>
      )}
    </main>
  )
}

function emptyMessage({
  query,
  date,
  time,
}: {
  query?: string
  date?: string
  time?: string
}): string {
  if (!query && !date) return 'Aucun épisode publié pour le moment.'
  const when = date
    ? `${time ? 'à ' + time.replace(':', 'h') + ' ' : ''}le ${formatDate(stationTimeToDate(date, time).toISOString())}`
    : ''
  if (query && date) return `Aucun épisode « ${query} » diffusé ${when}.`
  if (query) return `Aucun épisode ne correspond à « ${query} ».`
  return `Aucun épisode diffusé ${when}.`
}
