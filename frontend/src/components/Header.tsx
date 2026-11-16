import { useEffect, useState, type CSSProperties } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
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

// The desktop entrance plays once per page load: the header remounts on a
// language switch (`key={locale}` in __root) and must not replay it then.
// Server-side this stays false, so the SSR markup always carries the intro.
let introPlayed = false

export default function Header() {
  const { isPlaying } = usePlayer()
  const [intro] = useState(() => !introPlayed)
  useEffect(() => {
    introPlayed = true
  }, [])
  // Burger menu, only visible under the CSS breakpoint (Header.module.css).
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  // Any navigation (links, logo, back button) closes the menu.
  useEffect(() => setMenuOpen(false), [pathname])

  // While open: Escape closes it and the page behind doesn't scroll.
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [menuOpen])

  return (
    <header
      className={styles.header}
      data-menu-open={menuOpen}
      data-intro={intro}
    >
      <nav className={`page-wrap ${styles.nav}`}>
        <Link to="/" className={styles.logo} aria-label={m.header_home_label()}>
          <LogoMark />
        </Link>

        <button
          type="button"
          className={styles.burger}
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          aria-label={menuOpen ? m.header_menu_close() : m.header_menu_open()}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span aria-hidden="true" />
        </button>

        {/* Desktop: display: contents, so links and actions sit in the nav grid.
            Mobile: the dropdown panel. */}
        <div id="site-menu" className={styles.menu}>
          <div className={styles.links}>
            {nav().map((item, i) => (
              <Link
                key={item.to}
                to={item.to}
                className={styles.link}
                // Stagger index for the entrances (desktop intro, burger menu).
                style={{ '--i': i } as CSSProperties}
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
        </div>
      </nav>
    </header>
  )
}
