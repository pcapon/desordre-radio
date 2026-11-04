import { Link } from '@tanstack/react-router'
import styles from './Footer.module.css'
import { m } from '#/paraglide/messages'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className={styles.footer}>
      <div className={`page-wrap ${styles.grid}`}>
        <nav className={styles.col} aria-label={m.footer_nav_label()}>
          <span className="eyebrow mb-2">{m.footer_listen()}</span>
          <Link to="/">{m.footer_live()}</Link>
          <Link to="/emissions">{m.footer_shows()}</Link>
          <Link to="/replay">{m.footer_replay()}</Link>
          <Link to="/blog">{m.footer_blog()}</Link>
          <Link to="/about">{m.nav_about()}</Link>
        </nav>
        <div>
          <span className="eyebrow mb-4">{m.footer_station()}</span>
          <p className={styles.statement}>
            {m.footer_statement()}
          </p>
        </div>
      </div>
      <div className={`page-wrap ${styles.base}`}>
        <span>&copy; {year} Désordre Radio</span>
        <span>{m.footer_tagline()}</span>
      </div>
    </footer>
  )
}
