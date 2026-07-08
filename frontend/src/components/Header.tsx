import { Link } from '@tanstack/react-router'
import ThemeToggle from './ThemeToggle'

const NAV = [
  { to: '/', label: 'Accueil' },
  { to: '/replay', label: 'Replay' },
  // { to: '/journal', label: 'Journal' }, Ca peut etre utile
  { to: '/about', label: 'À propos' },
] as const

export default function Header() {
  return (
    <header className="site-header">
      <nav className="page-wrap site-nav">
        <Link to="/" className="site-logo">
          Désordre <span className="site-logo-accent">Radio</span>
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
          <ThemeToggle />
        </div>
      </nav>
    </header>
  )
}
