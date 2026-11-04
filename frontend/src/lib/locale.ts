import { getLocale } from '#/paraglide/runtime'
import type { Locale } from '#/paraglide/runtime'

/** BCP 47 tag for Intl date/time formatting in the given (or current) locale. */
export function intlLocale(locale: Locale = getLocale()): string {
  return locale === 'fr' ? 'fr-FR' : 'en-GB'
}
