import { createFileRoute } from '@tanstack/react-router'
import { strapiApi } from '@/data/loaders'
import { sampleEpisodes } from '@/data/sample'
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
  usingSample: boolean
}

export const Route = createFileRoute('/replay/')({
  component: ReplayPage,
  validateSearch,
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ deps }): Promise<LoaderResult> => {
    const { query, page } = deps.search
    try {
      const res = await strapiApi.episodes.getEpisodesData({
        data: { query, page },
      })
      if (res.data?.length) {
        return {
          episodes: res.data,
          pageCount: res.meta?.pagination?.pageCount ?? 1,
          query,
          usingSample: false,
        }
      }
    } catch (error) {
      console.error('Strapi episodes fetch failed, using sample data:', error)
    }

    // Fallback: filter the sample set so search still feels responsive.
    const filtered = query
      ? sampleEpisodes.filter((e) =>
          `${e.title} ${e.description ?? ''}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
      : sampleEpisodes
    return { episodes: filtered, pageCount: 1, query, usingSample: true }
  },
})

function ReplayPage() {
  const { episodes, pageCount, query, usingSample } = Route.useLoaderData()

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

      {usingSample && (
        <p className="demo-muted mb-6 text-sm">
          Données de démonstration — connectez Strapi et publiez des épisodes
          pour les voir ici.
        </p>
      )}

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
