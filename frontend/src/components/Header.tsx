import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import ThemeToggle from './ThemeToggle'
import { SocialLinks } from './SocialLinks'
import { LogoMark } from './Wordmark'
import { usePlayer } from '@/lib/player/player-context'
import styles from './Header.module.css'
import { m } from '#/paraglide/messages'
import { LanguageSwitcher } from './LanguageSwitcher'
import { intlLocale } from '@/lib/i18n'

// A function so labels are read in the current locale at render time.
const nav = () =>
  [
    { to: '/', label: m.nav_live() },
    { to: '/emissions', label: m.nav_shows() },
    { to: '/replay', label: m.nav_replay() },
    { to: '/blog', label: m.nav_blog() },
    { to: '/about', label: m.nav_about() },
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
        ? now.toLocaleTimeString(intlLocale(), { hour: '2-digit', minute: '2-digit' })
        : ''}
    </time>
  )
}

export default function Header() {
  const { isPlaying } = usePlayer()

  return (
    <header className={styles.header}>
      <nav className={`page-wrap ${styles.nav}`}>
        <Link to="/" className={styles.logo} aria-label={m.header_home_label()}>
          <LogoMark />
        </Link>

        <div className={styles.links}>
          {nav().map((item) => (
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
            {isPlaying ? m.header_listening() : m.header_not_listening()}
          </span>
          <ThemeToggle />
          <LanguageSwitcher />
          <SocialLinks />
        </div>
      </nav>
    </header>
  )
}
