import { Link } from '@tanstack/react-router'
import { m } from '#/paraglide/messages'

export function NotFound() {
  return (
    <main className="page-wrap py-16">
      <section>
        <p className="eyebrow mb-2">{m.not_found_eyebrow()}</p>
        <h1 className="section-title mb-6 text-[clamp(3.5rem,12vw,10rem)]">
          {m.not_found_title()}
        </h1>
        <p className="mb-8 text-lg text-[var(--ink-soft)]">
          {m.not_found_text()}
        </p>
        <Link to="/" className="demo-button">
          {m.not_found_back()}
        </Link>
      </section>
    </main>
  )
}
