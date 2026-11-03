import { createFileRoute, Link } from '@tanstack/react-router'
import { strapiApi } from '@/data/loaders'
import { EpisodeList } from '@/components/EpisodeList'
import { ArticleCard } from '@/components/ArticleCard'
import { LiveHero } from '@/components/LiveHero'
import { ShowCard } from '@/components/ShowCard'

export const Route = createFileRoute('/')({
  component: Home,
  loader: async () => {
    const [eps, arts, shws] = await Promise.allSettled([
      strapiApi.episodes.getLatestEpisodesData({ data: 8 }),
      strapiApi.articles.getArticlesData({ data: { page: 1 } }),
      strapiApi.shows.getShowsData(),
    ])

    // The home page must render (live hero + player) even when the CMS is
    // down, so a failed section is logged and simply left out.
    const dataOr = <T,>(
      result: PromiseSettledResult<{ data?: Array<T> }>,
      label: string,
    ): Array<T> => {
      if (result.status === 'fulfilled') return result.value.data ?? []
      console.error(`Strapi ${label} fetch failed:`, result.reason)
      return []
    }
    const episodes = dataOr(eps, 'episodes')
    const articles = dataOr(arts, 'articles')
    // Only the three shows that aired most recently (already sorted).
    const shows = dataOr(shws, 'shows')
      .filter((s) => s.lastAiredAt)
      .slice(0, 3)

    return { episodes, articles, shows }
  },
})

function Home() {
  const { episodes, articles, shows } = Route.useLoaderData()

  return (
    <main className="pb-12">
      <LiveHero />

      {episodes.length > 0 && (
      <section className="page-wrap mt-24 sm:mt-32">
        <div className="section-head">
          <h2 className="section-title">
            Replay<sup>{String(episodes.length).padStart(2, '0')}</sup>
          </h2>
          <Link to="/replay" className="section-link">
            Toutes les archives
          </Link>
        </div>
        <EpisodeList episodes={episodes} />
      </section>
      )}

      {shows.length > 0 && (
      <section className="page-wrap mt-24 sm:mt-32">
        <div className="section-head mb-8">
          <h2 className="section-title">
            Émissions<sup>{String(shows.length).padStart(2, '0')}</sup>
          </h2>
          <Link to="/emissions" className="section-link">
            Toutes les émissions
          </Link>
        </div>
        <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {shows.map((show, i) => (
            <ShowCard key={show.documentId} show={show} seed={i * 3} />
          ))}
        </div>
      </section>
      )}

      {articles.length > 0 && (
      <section className="page-wrap mt-24 sm:mt-32">
        <div className="section-head mb-8">
          <h2 className="section-title">
            Blog<sup>{String(articles.length).padStart(2, '0')}</sup>
          </h2>
          <Link to="/blog" className="section-link">
            Tous les articles
          </Link>
        </div>
        <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {articles.slice(0, 3).map((article, i) => (
            <ArticleCard
              key={article.documentId}
              article={article}
              seed={i * 3 + 1}
            />
          ))}
        </div>
      </section>
      )}
    </main>
  )
}
