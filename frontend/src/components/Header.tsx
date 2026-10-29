import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import ThemeToggle from './ThemeToggle'
import { SocialLinks } from './SocialLinks'
import { LogoMark } from './Wordmark'
import { usePlayer } from '@/lib/player/player-context'

const NAV = [
  { to: '/', label: 'Direct' },
  { to: '/replay', label: 'Replay' },
  { to: '/blog', label: 'Blog' },
  { to: '/about', label: 'À propos' },
] as const

/** Station clock, client-only so SSR markup stays stable. */
function Clock() {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const id = window.setInterval(() => setNow(new Date()), 15_000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <time className="site-clock" aria-hidden="true">
      {now
        ? now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        : ''}
    </time>
  )
}

export default function Header() {
  const { isPlaying } = usePlayer()

  return (
    <header className="site-header">
      <nav className="page-wrap site-nav">
        <Link to="/" className="site-logo" aria-label="Désordre Radio, accueil">
          <LogoMark />
        </Link>

        <div className="site-nav-links">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="nav-link"
              activeProps={{ className: 'nav-link is-active' }}
              activeOptions={{ exact: item.to === '/' }}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="site-nav-actions">
          <Clock />
          <span className="site-status" data-on={isPlaying}>
            {isPlaying ? 'En écoute' : 'Hors écoute'}
          </span>
          <ThemeToggle />
          <SocialLinks />
        </div>
      </nav>
    </header>
  )
}
