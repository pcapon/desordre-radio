import { createServerFn } from '@tanstack/react-start'
import { AZURACAST_STATION, AZURACAST_URL } from '@/lib/player/radio-config'
import type { TScheduleSlot } from '@/types/strapi'

type AzuraScheduleItem = {
  type: 'playlist' | 'streamer'
  name: string
  start: string
  end: string
  is_now: boolean
}

/**
 * Upcoming slots from AzuraCast's public station schedule (scheduled
 * playlists and streamer slots), soonest first. Fetched server-side so the
 * site needs no extra CORS rule. Returns [] when AzuraCast isn't configured
 * or doesn't answer: the schedule is a nice-to-have, never a page error.
 */
export const getScheduleData = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Array<TScheduleSlot>> => {
    if (!AZURACAST_URL) return []
    try {
      const res = await fetch(
        `${AZURACAST_URL}/api/station/${AZURACAST_STATION}/schedule?rows=100`,
        { signal: AbortSignal.timeout(4000) },
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const items = (await res.json()) as Array<AzuraScheduleItem>
      return items
        .map((i) => ({
          type: i.type,
          name: i.name,
          start: i.start,
          end: i.end,
          isNow: i.is_now,
        }))
        .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
    } catch (err) {
      console.error('AzuraCast schedule fetch failed:', err)
      return []
    }
  },
)
