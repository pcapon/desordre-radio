import { createFileRoute } from '@tanstack/react-router'
import { strapiApi } from '@/data/loaders'
import { sampleArticles } from '@/data/sample'
import { ArticleCard } from '@/components/ArticleCard'
import { Search } from '@/components/search'
import { Pagination } from '@/components/pagination'
import type { TArticle } from '@/types/strapi'

// Only emit params that are actually present so a bare /journal URL is not
// rewritten to /journal?page=1 (which would 307-redirect). Absent page = 1.
type JournalSearch = { query?: string; page?: number }

function validateSearch(input: Record<string, unknown>): JournalSearch {
  const out: JournalSearch = {}
  if (typeof input.query === 'string' && input.query) out.query = input.query
  const page = Number(input.page)
  if (Number.isFinite(page) && page > 1) out.page = page
  return out
}

type LoaderResult = {
  articles: Array<TArticle>
  pageCount: number
  query?: string
  usingSample: boolean
}

export const Route = createFileRoute('/journal/')({
  component: JournalPage,
  validateSearch,
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ deps }): Promise<LoaderResult> => {
    const { query, page } = deps.search
    try {
      const res = await strapiApi.articles.getArticlesData({
        data: { query, page },
      })
      if (res.data?.length) {
        return {
          articles: res.data,
          pageCount: res.meta?.pagination?.pageCount ?? 1,
          query,
          usingSample: false,
        }
      }
    } catch (error) {
      console.error('Strapi articles fetch failed, using sample data:', error)
    }

    const filtered = query
      ? sampleArticles.filter((a) =>
          `${a.title} ${a.description ?? ''}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
      : sampleArticles
    return { articles: filtered, pageCount: 1, query, usingSample: true }
  },
})

function JournalPage() {
  const { articles, pageCount, query, usingSample } = Route.useLoaderData()

  return (
    <main className="page-wrap px-4 pb-16 pt-10">
      <header className="mb-8 max-w-2xl">
        <p className="eyebrow mb-2">Lecture</p>
        <h1 className="display-title mb-3 text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
          Le journal
        </h1>
        <p className="text-[var(--sea-ink-soft)]">
          Entretiens, portraits et carnets d’écoute. Le prolongement écrit de
          l’antenne.
        </p>
      </header>

      <div className="mb-8 max-w-md">
        <Search />
      </div>

      {usingSample && (
        <p className="demo-muted mb-6 text-sm">
          Données de démonstration — publiez des articles dans Strapi pour les
          afficher ici.
        </p>
      )}

      {articles.length === 0 ? (
        <div className="demo-card text-center">
          <h2 className="mb-2 text-xl font-semibold">Aucun résultat</h2>
          <p className="demo-muted">
            {query
              ? `Aucun article ne correspond à « ${query} ».`
              : 'Aucun article publié pour le moment.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <ArticleCard key={article.documentId} article={article} />
            ))}
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
