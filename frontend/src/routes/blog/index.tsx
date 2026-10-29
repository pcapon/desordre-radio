import { createFileRoute } from '@tanstack/react-router'
import { strapiApi } from '@/data/loaders'
import { sampleArticles } from '@/data/sample'
import { ArticleCard } from '@/components/ArticleCard'
import { Search } from '@/components/search'
import { Pagination } from '@/components/pagination'
import type { TArticle } from '@/types/strapi'

// Only emit params that are actually present so a bare /blog URL is not
// rewritten to /blog?page=1 (which would 307-redirect). Absent page = 1.
type BlogSearch = { query?: string; page?: number }

function validateSearch(input: Record<string, unknown>): BlogSearch {
  const out: BlogSearch = {}
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

export const Route = createFileRoute('/blog/')({
  component: BlogPage,
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

function BlogPage() {
  const { articles, pageCount, query, usingSample } = Route.useLoaderData()

  return (
    <main className="page-wrap pb-16 pt-10 sm:pt-16">
      <header className="mb-10 grid gap-6 lg:grid-cols-[1fr_minmax(0,28rem)] lg:items-end">
        <h1 className="section-title text-[clamp(4rem,14vw,12rem)]">Blog</h1>
        <p className="m-0 text-lg leading-snug text-[var(--fg-soft)]">
          Entretiens, portraits et carnets d’écoute. Le prolongement écrit de
          l’antenne.
        </p>
      </header>

      <div className="mb-10 max-w-xl">
        <Search placeholder="Chercher un article…" />
      </div>

      {usingSample && (
        <p className="demo-muted mb-6 text-sm">
          Données de démonstration — publiez des articles dans Strapi pour les
          afficher ici.
        </p>
      )}

      {articles.length === 0 ? (
        <div className="border-t border-[var(--line)] py-10">
          <h2 className="display-title mb-3 text-3xl">Aucun résultat</h2>
          <p className="demo-muted">
            {query
              ? `Aucun article ne correspond à « ${query} ».`
              : 'Aucun article publié pour le moment.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-x-6 gap-y-12 border-t border-[var(--line)] pt-10 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article, i) => (
              <ArticleCard
                key={article.documentId}
                article={article}
                seed={i * 3}
              />
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
