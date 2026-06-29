import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  return (
    <main className="page-wrap px-4 py-12">
      <section className="island-shell rounded-2xl p-6 sm:p-10">
        <p className="eyebrow mb-2">À propos</p>
        <h1 className="display-title mb-4 text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
          Désordre Radio
        </h1>
        <div className="prose-editorial read-measure ml-0">
          <p>
            Désordre Radio est une webradio indépendante : un direct continu, des
            émissions à réécouter quand vous voulez, et un journal pour prolonger
            l’écoute par la lecture.
          </p>
          <h2>Écouter partout</h2>
          <p>
            Le player reste ancré en bas de l’écran sur toutes les pages. Lancez
            le direct ou un replay, puis continuez à explorer le site : le son ne
            s’arrête pas quand vous changez de page.
          </p>
          <h2>Un CMS pour le replay</h2>
          <p>
            Les émissions, épisodes et articles sont gérés dans Strapi. La
            rédaction publie depuis l’interface d’administration ; le site
            récupère le contenu via l’API et l’affiche aussitôt.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/replay" className="demo-button">
            Parcourir le replay
          </Link>
          <Link to="/journal" className="demo-button demo-button-secondary">
            Lire le journal
          </Link>
        </div>
      </section>
    </main>
  )
}
