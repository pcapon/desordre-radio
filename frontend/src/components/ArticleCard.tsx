import { Link } from '@tanstack/react-router'
import { StrapiImage } from '@/components/strapi-image'
import { formatDate } from '@/lib/format'
import type { TArticle } from '@/types/strapi'

export function ArticleCard({ article }: { article: TArticle }) {
  const date = formatDate(article.publishedAt || article.createdAt)

  return (
    <Link
      to="/journal/$slug"
      params={{ slug: article.slug }}
      className="content-card"
    >
      <div className="content-card-media">
        <StrapiImage
          src={article.cover?.url}
          alt={article.cover?.alternativeText || article.title}
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        {article.category?.name && (
          <p className="eyebrow mb-2">{article.category.name}</p>
        )}
        <h3 className="mb-2 text-lg font-semibold leading-snug text-[var(--sea-ink)]">
          {article.title}
        </h3>
        {article.description && (
          <p className="line-clamp-3 text-sm leading-relaxed text-[var(--sea-ink-soft)]">
            {article.description}
          </p>
        )}
        <div className="mt-auto flex items-center gap-3 pt-4 text-xs text-[var(--sea-ink-soft)]">
          {article.author?.name && <span>{article.author.name}</span>}
          {article.author?.name && date && <span aria-hidden="true">·</span>}
          {date && <span>{date}</span>}
        </div>
      </div>
    </Link>
  )
}
