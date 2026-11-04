import { useEffect, useRef, useState } from 'react'
import { m } from '#/paraglide/messages'
import { locales } from '#/paraglide/runtime'
import { useLocale, useSwitchLocale } from '@/lib/i18n'
import styles from './LanguageSwitcher.module.css'

/**
 * FR / EN dropdown for the header. Opens on hover or keyboard focus like the
 * dock's volume popover, and on tap for touch screens (no hover there).
 */
export function LanguageSwitcher() {
  const locale = useLocale()
  const switchLocale = useSwitchLocale()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close a tapped-open menu on an outside tap or Escape.
  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className={styles.lang} data-open={open}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={m.lang_current({ locale: locale.toUpperCase() })}
        onClick={() => setOpen((o) => !o)}
      >
        {locale}
      </button>
      <ul className={styles.pop} aria-label={m.lang_label()}>
        {locales.map((l) => (
          <li key={l}>
            <button
              type="button"
              lang={l}
              className={styles.option}
              aria-current={l === locale ? 'true' : undefined}
              onClick={() => {
                setOpen(false)
                switchLocale(l)
              }}
            >
              {l}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
