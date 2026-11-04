import handler from '@tanstack/react-start/server-entry'
import { paraglideMiddleware } from './paraglide/server.js'
import {
  cookieName,
  extractLocaleFromUrl,
  localizeHref,
} from './paraglide/runtime.js'
import { prefersFrench } from './lib/accept-language'

/**
 * First-visit language: a page request on a French URL (no `/en` prefix),
 * from a visitor who has never picked a language, goes to the English site
 * unless the browser's preferred language is French.
 *
 * Once a locale cookie exists (written on every visit and by the header
 * switcher), it decides instead, so choosing FR sticks. `/en/...` URLs are
 * never redirected, so shared English links open as shared.
 */
function languageRedirect(request: Request): Response | undefined {
  if (request.method !== 'GET') return
  // Only top-level page loads; assets, server functions and data fetches pass.
  const dest = request.headers.get('sec-fetch-dest')
  const accept = request.headers.get('accept') ?? ''
  if (dest ? dest !== 'document' : !accept.includes('text/html')) return

  const url = new URL(request.url)
  if (extractLocaleFromUrl(url) === 'en') return

  const cookie = readCookie(request.headers.get('cookie'), cookieName)
  const wanted =
    cookie === 'fr' || cookie === 'en'
      ? cookie
      : prefersFrench(request.headers.get('accept-language'))
        ? 'fr'
        : 'en'
  if (wanted === 'fr') return

  return new Response(null, {
    status: 302,
    headers: {
      Location: localizeHref(url.pathname + url.search, { locale: 'en' }),
      Vary: 'Cookie, Accept-Language',
    },
  })
}

function readCookie(header: string | null, name: string): string | undefined {
  for (const part of header?.split(';') ?? []) {
    const [k, v] = part.trim().split('=')
    if (k === name) return v
  }
}

export default {
  fetch(request: Request): Promise<Response> | Response {
    return (
      languageRedirect(request) ??
      // Request-scoped locale (AsyncLocalStorage) for SSR, head() and loaders.
      paraglideMiddleware(request, () => handler.fetch(request))
    )
  },
}
