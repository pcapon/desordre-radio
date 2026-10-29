import { createFileRoute, Link } from '@tanstack/react-router'
import { Loader2, Pause, Play } from 'lucide-react'
import { strapiApi } from '@/data/loaders'
import { sampleArticles, sampleEpisodes, sampleShows } from '@/data/sample'
import { EpisodeList } from '@/components/EpisodeList'
import { Wordmark } from '@/components/Wordmark'
import { SlicedImage } from '@/components/SlicedImage'
import { usePlayer } from '@/lib/player/player-context'
import { LIVE_TRACK } from '@/lib/player/radio-config'

export const Route = createFileRoute('/')({
  component: Home,
  loader: async () => {
    const [eps, arts, shws] = await Promise.allSettled([
      strapiApi.episodes.getLatestEpisodesData({ data: 8 }),
      strapiApi.articles.getArticlesData({ data: { page: 1 } }),
      strapiApi.shows.getShowsData(),
    ])

    const episodes =
      eps.status === 'fulfilled' && eps.value.data?.length
        ? eps.value.data
        : sampleEpisodes

    const articles =
      arts.status === 'fulfilled' && arts.value.data?.length
        ? arts.value.data
        : sampleArticles

    const shows =
      shws.status === 'fulfilled' && shws.value.data?.length
        ? shws.value.data
        : sampleShows

    return { episodes, articles, shows }
  },
})

function LiveHero() {
  const player = usePlayer()
  const liveActive = player.isLive && player.isPlaying
  const isLoading = player.isLive && player.status === 'loading'

  return (
    <section className="hero page-wrap">
      <Wordmark />
      <button
        type="button"
        onClick={() =>
          player.isLive ? player.toggle() : player.play(LIVE_TRACK)
        }
        className="tune-in"
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : liveActive ? (
          <Pause className="h-5 w-5" />
        ) : (
          <Play className="h-5 w-5" />
        )}
        {liveActive ? 'Couper le direct' : 'Écouter le direct'}
      </button>
    </section>
  )
}

function Home() {
  const { episodes, shows } = Route.useLoaderData()

  return (
    <main className="pb-12">
      <LiveHero />

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

      <section className="page-wrap mt-24 sm:mt-32">
        <div className="section-head mb-8">
          <h2 className="section-title">
            Émissions<sup>{String(shows.length).padStart(2, '0')}</sup>
          </h2>
        </div>
        <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {shows.map((show, i) => (
            <article key={show.documentId} className="content-card slice-host">
              <div className="content-card-media">
                <SlicedImage
                  src={show.cover?.url}
                  alt={show.cover?.alternativeText || show.title}
                  seed={i * 3}
                  className="h-full w-full"
                />
              </div>
              {show.schedule && (
                <p className="eyebrow mt-4 mb-0">{show.schedule}</p>
              )}
              <h3 className="card-title">{show.title}</h3>
              {show.description && (
                <p className="line-clamp-3 text-[0.95rem] leading-relaxed text-[var(--fg-soft)]">
                  {show.description}
                </p>
              )}
              {show.host && (
                <p className="mt-auto pt-3 text-sm">Avec {show.host}</p>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
