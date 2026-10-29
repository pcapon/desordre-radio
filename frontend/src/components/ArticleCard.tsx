import { Link } from '@tanstack/react-router'
import { SlicedImage } from '@/components/SlicedImage'
import { formatDate } from '@/lib/format'
import type { TArticle } from '@/types/strapi'

export function ArticleCard({
  article,
  seed = 0,
}: {
  article: TArticle
  seed?: number
}) {
  const date = formatDate(article.publishedAt || article.createdAt)

  return (
    <Link
      to="/blog/$slug"
      params={{ slug: article.slug }}
      className="content-card slice-host"
    >
      <div className="content-card-media">
        <SlicedImage
          src={article.cover?.url}
          alt={article.cover?.alternativeText || article.title}
          seed={seed}
          className="h-full w-full"
        />
      </div>
      {article.category?.name && (
        <p className="eyebrow mt-4 mb-0">{article.category.name}</p>
      )}
      <h3 className="card-title">{article.title}</h3>
      {article.description && (
        <p className="line-clamp-3 text-[0.95rem] leading-relaxed text-[var(--fg-soft)]">
          {article.description}
        </p>
      )}
      {(article.author?.name || date) && (
        <p className="mt-auto flex gap-3 pt-3 text-sm">
          {article.author?.name && <span>{article.author.name}</span>}
          {article.author?.name && date && <span aria-hidden="true">·</span>}
          {date && <span className="text-[var(--fg-soft)]">{date}</span>}
        </p>
      )}
    </Link>
  )
}
