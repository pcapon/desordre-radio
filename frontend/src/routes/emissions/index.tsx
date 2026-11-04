import { createFileRoute } from '@tanstack/react-router'
import { strapiApi } from '@/data/loaders'
import { ShowCard } from '@/components/ShowCard'
import { m } from '#/paraglide/messages'

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
          {m.nav_shows()}
        </h1>
        <p className="m-0 text-lg leading-snug text-[var(--fg-soft)]">
          {m.shows_intro()}
        </p>
      </header>

      {shows.length === 0 ? (
        <div className="border-t border-[var(--line)] py-10">
          <h2 className="display-title mb-3 text-3xl">{m.shows_empty_title()}</h2>
          <p className="demo-muted">{m.shows_empty_text()}</p>
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
