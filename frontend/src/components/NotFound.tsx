import { Link } from '@tanstack/react-router'

export function NotFound() {
  return (
    <main className="page-wrap px-4 py-12">
      <section className="island-shell rounded-2xl p-6 sm:p-10">
        <p className="eyebrow mb-2">404</p>
        <h1 className="display-title mb-4 text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
          Page introuvable
        </h1>
        <p className="mb-8 text-[var(--sea-ink-soft)]">
          Cette page n’existe pas ou a été déplacée. Le direct, lui, continue.
        </p>
        <Link to="/" className="demo-button">
          Retour à l’accueil
        </Link>
      </section>
    </main>
  )
}
