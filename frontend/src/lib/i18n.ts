import { useRouter, useRouterState } from '@tanstack/react-router'
import {
  getLocale,
  localizeHref,
  setLocale,
} from '#/paraglide/runtime'
import type { Locale } from '#/paraglide/runtime'

export { intlLocale } from './locale'

/**
 * The current locale, re-read whenever the router's location changes. The URL
 * decides the locale (`/en/...` = English), so a switch or a back/forward
 * between languages shows up here once the new URL is committed.
 */
export function useLocale(): Locale {
  return useRouterState({ select: () => getLocale() })
}

/**
 * Switch language without reloading the document, so the live stream and the
 * SoundCloud widget keep playing.
 *
 * Paraglide's default `setLocale()` reloads the page; here it only records the
 * choice in the cookie, then the localized URL is pushed onto history. The
 * router reads it back through its `rewrite.input` (same route, new prefix),
 * and the root remounts the UI under `useLocale()`'s new value.
 */
export function useSwitchLocale() {
  const router = useRouter()
  return (next: Locale) => {
    if (next === getLocale()) return
    setLocale(next, { reload: false })
    // `location.href` is the router's internal, de-localized href.
    router.history.push(localizeHref(router.state.location.href, { locale: next }))
  }
}
