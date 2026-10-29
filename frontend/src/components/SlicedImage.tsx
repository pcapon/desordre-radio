import { getStrapiMedia } from '@/lib/strapi-utils'

// Vertical offset per strip. Fixed (not random) so SSR and client agree;
// `seed` rotates the pattern so neighbouring images don't look identical.
const OFFSETS = [-11, 7, -4, 12, -8, 3, -13, 9]

interface SlicedImageProps {
  src: string | undefined | null
  alt?: string | null
  slices?: number
  seed?: number
  /**
   * "hover": strips realign while an ancestor `.slice-host` is hovered.
   * "intro": strips start out of line and settle once, on mount.
   */
  mode?: 'hover' | 'intro'
  className?: string
}

/**
 * An image cut into vertical strips knocked out of line, the "désordre",
 * which slide back into a single picture on hover.
 */
export function SlicedImage({
  src,
  alt,
  slices = 5,
  seed = 0,
  mode = 'hover',
  className = '',
}: SlicedImageProps) {
  if (!src) return <div className={`slices slices-empty ${className}`} />

  const url = getStrapiMedia(src)

  return (
    <div
      className={`slices ${className}`}
      data-mode={mode}
      role="img"
      aria-label={alt || undefined}
    >
      {Array.from({ length: slices }, (_, i) => (
        <div
          key={i}
          className="slice"
          style={
            {
              '--i': i,
              '--n': slices,
              '--off': `${OFFSETS[(i + seed) % OFFSETS.length]}%`,
            } as React.CSSProperties
          }
        >
          <img src={url} alt="" loading="lazy" />
          <img src={url} alt="" loading="lazy" className="slice-ca" />
        </div>
      ))}
    </div>
  )
}

/**
 * Chromatic aberration: red shifted left, blue shifted right, green in place,
 * screened back together. Rendered once in the root document and referenced
 * by `.slice-ca` as `filter: url(#chromatic-aberration)`.
 */
export function ChromaticAberrationFilter() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
      <filter id="chromatic-aberration" colorInterpolationFilters="sRGB">
        <feColorMatrix in="SourceGraphic" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="red" />
        <feOffset in="red" dx="-3" result="red-shifted" />
        <feColorMatrix in="SourceGraphic" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="green" />
        <feColorMatrix in="SourceGraphic" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="blue" />
        <feOffset in="blue" dx="3" result="blue-shifted" />
        <feBlend in="red-shifted" in2="green" mode="screen" result="red-green" />
        <feBlend in="red-green" in2="blue-shifted" mode="screen" />
      </filter>
    </svg>
  )
}
