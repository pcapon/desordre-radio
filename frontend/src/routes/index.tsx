import { createFileRoute, Link } from '@tanstack/react-router'
import { Loader2, Pause, Play, Radio } from 'lucide-react'
import { strapiApi } from '@/data/loaders'
import { sampleArticles, sampleEpisodes, sampleShows } from '@/data/sample'
import { EpisodeCard } from '@/components/EpisodeCard'
import { ArticleCard } from '@/components/ArticleCard'
import { StrapiImage } from '@/components/strapi-image'
import { usePlayer } from '@/lib/player/player-context'
import { LIVE_TRACK, STATION_NAME } from '@/lib/player/radio-config'

export const Route = createFileRoute('/')({
  component: Home,
  loader: async () => {
    const [eps, arts] = await Promise.allSettled([
      strapiApi.episodes.getLatestEpisodesData({ data: 4 }),
      strapiApi.articles.getArticlesData({ data: { page: 1 } }),
    ])

    const episodes =
      eps.status === 'fulfilled' && eps.value.data?.length
        ? eps.value.data
        : sampleEpisodes.slice(0, 4)

    const articles =
      arts.status === 'fulfilled' && arts.value.data?.length
        ? arts.value.data
        : sampleArticles

    return { episodes, articles, shows: sampleShows }
  },
})

function LiveHero() {
  const player = usePlayer()
  const liveActive = player.isLive && player.isPlaying
  const isLoading = player.isLive && player.status === 'loading'

  return (
    <section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-12 sm:px-12 sm:py-16">
      <div className="pointer-events-none absolute -left-24 -top-28 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.28),transparent_66%)]" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(34,197,94,0.18),transparent_66%)]" />

      <p className="eyebrow mb-4 text-[#d6453f]">
        <span className="radio-live-dot" /> En direct · {STATION_NAME}
      </p>
      <h1 className="display-title mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-[var(--sea-ink)] sm:text-6xl">
        Une webradio qui assume le désordre.
      </h1>
      <p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
        Le direct, les archives de replay et un journal éditorial. Lancez
        l’antenne — le player vous suit sur chaque page, vous pouvez lire,
        flâner et continuer d’écouter.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() =>
            player.isLive ? player.toggle() : player.play(LIVE_TRACK)
          }
          className="inline-flex items-center gap-2 rounded-full border border-[rgba(139,92,246,0.35)] bg-[linear-gradient(165deg,var(--lagoon),var(--lagoon-deep))] px-6 py-3 text-sm font-bold text-[#1a0a3a] no-underline shadow-[0_12px_28px_rgba(139,92,246,0.35)] transition hover:-translate-y-0.5"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : liveActive ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5" />
          )}
          {liveActive ? 'En écoute…' : 'Écouter le direct'}
        </button>
        <Link
          to="/replay"
          className="inline-flex items-center gap-2 rounded-full border border-[rgba(139,92,246,0.22)] bg-[var(--surface)] px-6 py-3 text-sm font-semibold text-[var(--sea-ink)] no-underline transition hover:-translate-y-0.5 hover:border-[rgba(139,92,246,0.45)]"
        >
          <Radio className="h-4 w-4" /> Parcourir le replay
        </Link>
      </div>
    </section>
  )
}

function Home() {
  const { episodes, articles, shows } = Route.useLoaderData()

  return (
    <main className="page-wrap px-4 pb-16 pt-10">
      <LiveHero />

      {/* Latest replay */}
      <section className="mt-14">
        <div className="section-head">
          <h2 className="section-title">Derniers replays</h2>
          <Link to="/replay" className="text-sm font-semibold">
            Tout le replay →
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {episodes.map((episode) => (
            <EpisodeCard key={episode.documentId} episode={episode} />
          ))}
        </div>
      </section>

      {/* Shows */}
      <section className="mt-14">
        <div className="section-head">
          <h2 className="section-title">Nos émissions</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shows.map((show) => (
            <article key={show.documentId} className="content-card">
              <div className="content-card-media">
                <StrapiImage
                  src={show.cover?.url}
                  alt={show.cover?.alternativeText || show.title}
                />
              </div>
              <div className="flex flex-1 flex-col p-5">
                {show.schedule && <p className="eyebrow mb-2">{show.schedule}</p>}
                <h3 className="mb-2 text-lg font-semibold leading-snug text-[var(--sea-ink)]">
                  {show.title}
                </h3>
                {show.description && (
                  <p className="line-clamp-3 text-sm leading-relaxed text-[var(--sea-ink-soft)]">
                    {show.description}
                  </p>
                )}
                {show.host && (
                  <p className="mt-auto pt-4 text-xs text-[var(--sea-ink-soft)]">
                    Animé par {show.host}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Journal */}
      <section className="mt-14">
        <div className="section-head">
          <h2 className="section-title">Le journal</h2>
          <Link to="/journal" className="text-sm font-semibold">
            Tous les articles →
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <ArticleCard key={article.documentId} article={article} />
          ))}
        </div>
      </section>
    </main>
  )
}
