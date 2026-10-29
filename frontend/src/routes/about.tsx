import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  return (
    <main className="page-wrap pb-12 pt-10 sm:pt-16">
      <section>
        <p className="eyebrow mb-3">À propos</p>
        <h1 className="section-title mb-12 text-[clamp(3.5rem,12vw,10rem)]">
          Désordre Radio
        </h1>
        <div className="prose-editorial read-measure ml-0">
          <p className="text-2xl leading-snug">
            Désordre Radio est une webradio indépendante dédiée à la techno, aux
            musiques électroniques et expérimentales : un direct continu et des
            émissions à réécouter quand vous voulez.
          </p>
          <h2>Écouter partout</h2>
          <p>
            Le player reste ancré en bas de l’écran sur toutes les pages. Lancez
            le direct ou un replay, puis continuez à explorer le site : le son ne
            s’arrête pas quand vous changez de page.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/replay" className="demo-button">
            Parcourir le replay
          </Link>
        </div>
      </section>
    </main>
  )
}
