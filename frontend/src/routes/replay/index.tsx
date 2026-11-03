import { createFileRoute } from '@tanstack/react-router'
import { strapiApi } from '@/data/loaders'
import { EpisodeList } from '@/components/EpisodeList'
import { Search } from '@/components/search'
import { Pagination } from '@/components/pagination'
import type { TEpisode } from '@/types/strapi'

// Only emit params that are actually present so a bare /replay URL is not
// rewritten to /replay?page=1 (which would 307-redirect). Absent page = 1.
type ReplaySearch = { query?: string; page?: number }

function validateSearch(input: Record<string, unknown>): ReplaySearch {
  const out: ReplaySearch = {}
  if (typeof input.query === 'string' && input.query) out.query = input.query
  const page = Number(input.page)
  if (Number.isFinite(page) && page > 1) out.page = page
  return out
}

type LoaderResult = {
  episodes: Array<TEpisode>
  pageCount: number
  query?: string
}

export const Route = createFileRoute('/replay/')({
  component: ReplayPage,
  validateSearch,
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ deps }): Promise<LoaderResult> => {
    const { query, page } = deps.search
    const res = await strapiApi.episodes.getEpisodesData({
      data: { query, page },
    })
    return {
      episodes: res.data ?? [],
      pageCount: res.meta?.pagination?.pageCount ?? 1,
      query,
    }
  },
})

function ReplayPage() {
  const { episodes, pageCount, query } = Route.useLoaderData()

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
      </div>

      {episodes.length === 0 ? (
        <div className="border-t border-[var(--line)] py-10">
          <h2 className="display-title mb-3 text-3xl">Aucun résultat</h2>
          <p className="demo-muted">
            {query
              ? `Aucun épisode ne correspond à « ${query} ».`
              : 'Aucun épisode publié pour le moment.'}
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
