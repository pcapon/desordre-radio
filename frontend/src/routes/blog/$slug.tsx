import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { strapiApi } from '@/data/loaders'
import { sampleArticles } from '@/data/sample'
import { SlicedImage } from '@/components/SlicedImage'
import { BlockRenderer } from '@/components/blocks'
import { formatDate } from '@/lib/format'
import type { TArticle } from '@/types/strapi'

export const Route = createFileRoute('/blog/$slug')({
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
    <main className="page-wrap py-16">
      <h1 className="display-title mb-4 text-5xl">Article introuvable</h1>
      <p className="demo-muted mb-6">Cet article n’existe pas ou plus.</p>
      <Link to="/blog" className="demo-button demo-button-secondary">
        Retour au blog
      </Link>
    </main>
  )
}

function ArticleReader() {
  const { article } = Route.useLoaderData()
  const date = formatDate(article.publishedAt || article.createdAt)

  return (
    <main className="page-wrap pb-16 pt-8">
      <Link to="/blog" className="section-link inline-flex items-center gap-2">
        <ArrowLeft className="h-4 w-4" /> Blog
      </Link>

      <article className="mt-8">
        <header className="max-w-5xl">
          {article.category?.name && (
            <p className="eyebrow mb-3">{article.category.name}</p>
          )}
          <h1 className="display-title mb-6 text-[clamp(2.6rem,6.5vw,6rem)]">
            {article.title}
          </h1>
          {article.description && (
            <p className="mb-8 max-w-[52ch] text-xl leading-snug tracking-[-0.02em]">
              {article.description}
            </p>
          )}
          {(article.author?.name || date) && (
            <dl className="mb-10 flex flex-wrap gap-x-8 gap-y-2 border-y border-[var(--line)] py-3 text-sm text-[var(--fg-soft)]">
              {article.author?.name && (
                <div className="flex gap-2">
                  <dt>Par</dt>
                  <dd className="m-0 text-[var(--ink)]">
                    {article.author.name}
                  </dd>
                </div>
              )}
              {date && (
                <div className="flex gap-2">
                  <dt>Publié le</dt>
                  <dd className="m-0 text-[var(--ink)]">{date}</dd>
                </div>
              )}
            </dl>
          )}
        </header>

        {article.cover?.url && (
          <figure className="slice-host mb-12">
            <SlicedImage
              src={article.cover.url}
              alt={article.cover.alternativeText || article.title}
              slices={8}
              className="aspect-[16/9] w-full"
            />
          </figure>
        )}

        <div className="prose-editorial read-measure ml-0">
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
