import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { StrapiImage } from '@/components/strapi-image'
import { PlayEpisodeButton } from '@/components/PlayEpisodeButton'
import { formatDate, formatDuration } from '@/lib/format'
import type { TEpisode } from '@/types/strapi'

/**
 * Coverflow-style carousel for the latest episodes: the centered card is
 * scaled up and glows, its neighbours peek in on either side. Navigation is
 * driven by native horizontal scroll-snapping, so trackpad, touch, the arrows
 * and the dots all stay in sync.
 */
export function PodcastCarousel({ episodes }: { episodes: Array<TEpisode> }) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  const slides = useCallback(
    () =>
      Array.from(
        viewportRef.current?.querySelectorAll<HTMLElement>('[data-slide]') ??
          [],
      ),
    [],
  )

  const recalc = useCallback(() => {
    const vp = viewportRef.current
    if (!vp) return
    const center = vp.scrollLeft + vp.clientWidth / 2
    let best = 0
    let bestDist = Infinity
    slides().forEach((slide, i) => {
      const slideCenter = slide.offsetLeft + slide.offsetWidth / 2
      const dist = Math.abs(slideCenter - center)
      if (dist < bestDist) {
        bestDist = dist
        best = i
      }
    })
    setActive(best)
  }, [slides])

  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(recalc)
    }
    vp.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', recalc)
    recalc()
    return () => {
      vp.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', recalc)
      cancelAnimationFrame(raf)
    }
  }, [recalc])

  const scrollToIndex = (index: number) => {
    const vp = viewportRef.current
    const all = slides()
    const target = all[Math.max(0, Math.min(index, all.length - 1))]
    if (!vp || !target) return
    vp.scrollTo({
      left: target.offsetLeft + target.offsetWidth / 2 - vp.clientWidth / 2,
      behavior: 'smooth',
    })
  }

  return (
    <div className="carousel full-bleed">
      <div className="carousel-viewport" ref={viewportRef}>
        {episodes.map((episode, i) => {
          const isActive = i === active
          const meta = [
            formatDate(episode.airedAt || episode.publishedAt),
            formatDuration(episode.duration),
          ]
            .filter(Boolean)
            .join(' · ')

          return (
            <div className="carousel-slide" data-slide key={episode.documentId}>
              <article className="carousel-card" data-active={isActive}>
                <Link
                  to="/replay/$slug"
                  params={{ slug: episode.slug }}
                  className="carousel-card-link"
                  tabIndex={isActive ? 0 : -1}
                >
                  <StrapiImage
                    src={episode.cover?.url}
                    alt={episode.cover?.alternativeText || episode.title}
                    className="carousel-card-img"
                  />
                  <span className="carousel-card-scrim" aria-hidden="true" />
                  {episode.show?.title && (
                    <span className="carousel-card-badge">
                      {episode.show.title}
                    </span>
                  )}
                  <div className="carousel-card-body">
                    <h3 className="carousel-card-title">{episode.title}</h3>
                    {meta && <p className="carousel-card-meta">{meta}</p>}
                  </div>
                </Link>

                <div className="carousel-card-fab">
                  <PlayEpisodeButton episode={episode} />
                </div>

                {!isActive && (
                  <button
                    type="button"
                    className="carousel-card-hit"
                    onClick={() => scrollToIndex(i)}
                    aria-label={`Voir ${episode.title}`}
                  />
                )}
              </article>
            </div>
          )
        })}
      </div>

      <div className="carousel-controls page-wrap">
        <button
          type="button"
          className="carousel-arrow"
          onClick={() => scrollToIndex(active - 1)}
          disabled={active === 0}
          aria-label="Podcast précédent"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="carousel-dots">
          {episodes.map((episode, i) => (
            <button
              type="button"
              key={episode.documentId}
              className="carousel-dot"
              data-active={i === active}
              onClick={() => scrollToIndex(i)}
              aria-label={`Aller au podcast ${i + 1}`}
              aria-current={i === active}
            />
          ))}
        </div>
        <button
          type="button"
          className="carousel-arrow"
          onClick={() => scrollToIndex(active + 1)}
          disabled={active === episodes.length - 1}
          aria-label="Podcast suivant"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
