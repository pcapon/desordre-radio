import { createFileRoute } from '@tanstack/react-router'
import { strapiApi } from '@/data/loaders'
import { ShowCard } from '@/components/ShowCard'

export const Route = createFileRoute('/emissions/')({
  component: ShowsPage,
  loader: async () => {
    const res = await strapiApi.shows.getShowsData()
    return { shows: res.data ?? [] }
  },
})

function ShowsPage() {
  const { shows } = Route.useLoaderData()

  return (
    <main className="page-wrap pb-16 pt-10 sm:pt-16">
      <header className="mb-10 grid gap-6 lg:grid-cols-[1fr_minmax(0,28rem)] lg:items-end">
        <h1 className="section-title text-[clamp(4rem,14vw,12rem)]">
          Émissions
        </h1>
        <p className="m-0 text-lg leading-snug text-[var(--fg-soft)]">
          Les rendez-vous de l’antenne, des plus récemment diffusés aux plus
          anciens. Chaque émission garde ses replays.
        </p>
      </header>

      {shows.length === 0 ? (
        <div className="border-t border-[var(--line)] py-10">
          <h2 className="display-title mb-3 text-3xl">Aucune émission</h2>
          <p className="demo-muted">Aucune émission publiée pour le moment.</p>
        </div>
      ) : (
        <div className="grid gap-x-6 gap-y-12 border-t border-[var(--line)] pt-10 sm:grid-cols-2 lg:grid-cols-3">
          {shows.map((show, i) => (
            <ShowCard key={show.documentId} show={show} seed={i * 3} />
          ))}
        </div>
      )}
    </main>
  )
}
