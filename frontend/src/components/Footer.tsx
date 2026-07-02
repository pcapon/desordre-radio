import { Link } from '@tanstack/react-router'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-20 border-t border-[var(--line)] px-4 pb-12 pt-10 text-[var(--sea-ink-soft)]">
      <div className="page-wrap flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm">
          <p className="m-0 inline-flex items-center gap-2 text-base font-semibold text-[var(--sea-ink)]">
            <span className="h-2 w-2 rounded-full bg-[linear-gradient(90deg,#8b5cf6,#22d3ee)]" />
            Désordre Radio
          </p>
          <p className="mt-2 text-sm">
            Webradio en direct, replay à la demande et journal éditorial.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
          <Link to="/replay" className="nav-link">
            Replay
          </Link>
          <Link to="/journal" className="nav-link">
            Journal
          </Link>
          <Link to="/about" className="nav-link">
            À propos
          </Link>
        </nav>
      </div>
      <div className="page-wrap mt-8 flex flex-col items-center justify-between gap-2 border-t border-[var(--line)] pt-6 text-center sm:flex-row sm:text-left">
        <p className="m-0 text-sm">&copy; {year} Désordre Radio.</p>
        <p className="island-kicker m-0">Built with TanStack Start + Strapi</p>
      </div>
    </footer>
  )
}
