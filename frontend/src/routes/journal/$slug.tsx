import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { strapiApi } from '@/data/loaders'
import { sampleArticles } from '@/data/sample'
import { StrapiImage } from '@/components/strapi-image'
import { BlockRenderer } from '@/components/blocks'
import { formatDate } from '@/lib/format'
import type { TArticle } from '@/types/strapi'

export const Route = createFileRoute('/journal/$slug')({
  component: ArticleReader,
  notFoundComponent: ArticleNotFound,
  loader: async ({ params }): Promise<{ article: TArticle }> => {
    try {
      const res = await strapiApi.articles.getArticleBySlugData({
        data: params.slug,
      })
      if (res.data?.length) return { article: res.data[0] }
    } catch (error) {
      console.error('Strapi article fetch failed, trying sample data:', error)
    }

    const sample = sampleArticles.find((a) => a.slug === params.slug)
    if (sample) return { article: sample }

    throw notFound()
  },
})

function ArticleNotFound() {
  return (
    <main className="page-wrap px-4 py-16 text-center">
      <h1 className="display-title mb-3 text-3xl font-bold">Article introuvable</h1>
      <p className="demo-muted mb-6">Cet article n’existe pas ou plus.</p>
      <Link to="/journal" className="demo-button demo-button-secondary">
        Retour au journal
      </Link>
    </main>
  )
}

function ArticleReader() {
  const { article } = Route.useLoaderData()
  const date = formatDate(article.publishedAt || article.createdAt)

  return (
    <main className="page-wrap px-4 pb-20 pt-8">
      <Link
        to="/journal"
        className="mb-8 inline-flex items-center gap-2 text-sm font-semibold no-underline"
      >
        <ArrowLeft className="h-4 w-4" /> Journal
      </Link>

      <article>
        <header className="read-measure text-center">
          {article.category?.name && (
            <p className="eyebrow mb-3 justify-center">{article.category.name}</p>
          )}
          <h1 className="display-title mb-5 text-3xl font-bold leading-tight text-[var(--sea-ink)] sm:text-5xl">
            {article.title}
          </h1>
          {article.description && (
            <p className="mb-6 text-lg leading-relaxed text-[var(--sea-ink-soft)]">
              {article.description}
            </p>
          )}
          <div className="mb-10 flex items-center justify-center gap-3 text-sm text-[var(--sea-ink-soft)]">
            {article.author?.name && (
              <span className="font-semibold text-[var(--sea-ink)]">
                {article.author.name}
              </span>
            )}
            {article.author?.name && date && <span aria-hidden="true">·</span>}
            {date && <span>{date}</span>}
          </div>
        </header>

        {article.cover?.url && (
          <figure className="mb-10">
            <StrapiImage
              src={article.cover.url}
              alt={article.cover.alternativeText || article.title}
              className="aspect-[16/9] w-full rounded-[1.5rem] border border-[var(--line)]"
            />
          </figure>
        )}

        <div className="prose-editorial read-measure">
          {article.blocks && article.blocks.length > 0 ? (
            <BlockRenderer blocks={article.blocks} />
          ) : (
            <p>Cet article n’a pas encore de contenu.</p>
          )}
        </div>
      </article>
    </main>
  )
}
