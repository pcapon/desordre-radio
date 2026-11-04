import { createFileRoute, Link } from '@tanstack/react-router'
import { m } from '#/paraglide/messages'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  return (
    <main className="page-wrap pb-12 pt-10 sm:pt-16">
      <section>
        <p className="eyebrow mb-3">{m.about_eyebrow()}</p>
        <h1 className="section-title mb-12 text-[clamp(3.5rem,12vw,10rem)]">
          Désordre Radio
        </h1>
        <div className="prose-editorial read-measure ml-0">
          <p className="text-2xl leading-snug">
            {m.about_lead()}
          </p>
          <h2>{m.about_listen_title()}</h2>
          <p>
            {m.about_listen_text()}
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/replay" className="demo-button">
            {m.about_browse()}
          </Link>
        </div>
      </section>
    </main>
  )
}
