import { Link } from '@tanstack/react-router'

export function NotFound() {
  return (
    <main className="page-wrap py-16">
      <section>
        <p className="eyebrow mb-2">Erreur 404</p>
        <h1 className="section-title mb-6 text-[clamp(3.5rem,12vw,10rem)]">
          Hors fréquence
        </h1>
        <p className="mb-8 text-lg text-[var(--ink-soft)]">
          Cette page n’existe pas ou a été déplacée. Le direct, lui, continue.
        </p>
        <Link to="/" className="demo-button">
          Retour à l’accueil
        </Link>
      </section>
    </main>
  )
}
