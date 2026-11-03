import { Link } from '@tanstack/react-router'
import styles from './Footer.module.css'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className={styles.footer}>
      <div className={`page-wrap ${styles.grid}`}>
        <nav className={styles.col} aria-label="Pied de page">
          <span className="eyebrow mb-2">Écouter</span>
          <Link to="/">Le direct</Link>
          <Link to="/emissions">Les émissions</Link>
          <Link to="/replay">Le replay</Link>
          <Link to="/blog">Le blog</Link>
          <Link to="/about">À propos</Link>
        </nav>
        <div>
          <span className="eyebrow mb-4">La radio</span>
          <p className={styles.statement}>
            Techno, électronique, expérimental. Un flux continu, 24 h/24, sans
            ordre de passage.
          </p>
        </div>
      </div>
      <div className={`page-wrap ${styles.base}`}>
        <span>&copy; {year} Désordre Radio</span>
        <span>Webradio indépendante</span>
      </div>
    </footer>
  )
}
