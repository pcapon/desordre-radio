import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import ThemeToggle from './ThemeToggle'
import { SocialLinks } from './SocialLinks'
import { LogoMark } from './Wordmark'
import { usePlayer } from '@/lib/player/player-context'
import styles from './Header.module.css'

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
    <time className={styles.clock} aria-hidden="true">
      {now
        ? now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        : ''}
    </time>
  )
}

export default function Header() {
  const { isPlaying } = usePlayer()

  return (
    <header className={styles.header}>
      <nav className={`page-wrap ${styles.nav}`}>
        <Link to="/" className={styles.logo} aria-label="Désordre Radio, accueil">
          <LogoMark />
        </Link>

        <div className={styles.links}>
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={styles.link}
              activeProps={{ className: `${styles.link} ${styles.active}` }}
              activeOptions={{ exact: item.to === '/' }}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className={styles.actions}>
          <Clock />
          <span className={styles.status} data-on={isPlaying}>
            {isPlaying ? 'En écoute' : 'Hors écoute'}
          </span>
          <ThemeToggle />
          <SocialLinks />
        </div>
      </nav>
    </header>
  )
}
