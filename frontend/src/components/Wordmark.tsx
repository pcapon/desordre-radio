import { useEffect, useRef, useState } from 'react'

/**
 * The "désordre" wordmark: set calmly, except two letters split into RGB
 * layers like a signal slightly out of register. Hovering the word brings
 * them back in line.
 */
const GLITCHED: Record<number, { sx: string; y: string }> = {
  // The outer letters trail inward so the clipped edges never cut a layer.
  0: { sx: '0.015em', y: '0.02em' }, // d
  1: { sx: '0.02em', y: '-0.03em' }, // é
  2: { sx: '-0.025em', y: '0.01em' }, // s
  3: { sx: '-0.035em', y: '-0.04em' }, // o
  4: { sx: '-0.02em', y: '0.03em' }, // r
  5: { sx: '0.015em', y: '-0.015em' }, // d
  6: { sx: '-0.03em', y: '0.025em' }, // r
  7: { sx: '-0.025em', y: '-0.02em' }, // e
}

/** The letters alone, so the same mark works as the hero title and the logo. */
function Letters() {
  return (
    <>
      {Array.from('désordre').map((c, i) => {
        const g = GLITCHED[i]
        return g ? (
          <span
            key={i}
            aria-hidden="true"
            className="wm-glitch"
            style={{ '--sx': g.sx, '--y': g.y } as React.CSSProperties}
          >
            {c}
          </span>
        ) : (
          <span key={i} aria-hidden="true">
            {c}
          </span>
        )
      })}
    </>
  )
}

export function Wordmark() {
  // Hover stays off until the entrance has put the letters out of register;
  // the `wm-split` keyframes (styles.css) end that entrance.
  const [entering, setEntering] = useState(true)
  const ref = useRef<HTMLHeadingElement>(null)

  // If the entrance already finished before hydration, animationend was missed.
  useEffect(() => {
    const running = ref.current
      ?.getAnimations({ subtree: true })
      .some((a) => (a as CSSAnimation).animationName === 'wm-split')
    if (!running) setEntering(false)
  }, [])

  return (
    <h1
      ref={ref}
      className="wordmark"
      aria-label="Désordre"
      data-entering={entering}
      onAnimationEnd={(e) => {
        if (e.animationName === 'wm-split') setEntering(false)
      }}
    >
      <Letters />
    </h1>
  )
}

/** Small version for the header; the surrounding link carries the label. */
export function LogoMark() {
  return (
    <span className="logo-mark" aria-hidden="true">
      <Letters />
      <span className="logo-suffix">radio</span>
    </span>
  )
}
