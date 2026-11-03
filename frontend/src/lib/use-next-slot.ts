import { useQuery } from '@tanstack/react-query'
import { getScheduleData } from '@/data/loaders/schedule'
import type { TScheduleSlot, TShow } from '@/types/strapi'

/** AzuraCast schedule, shared by every component that needs it. */
export function useSchedule() {
  return useQuery({
    queryKey: ['azuracast', 'schedule'],
    queryFn: () => getScheduleData(),
    staleTime: 5 * 60_000,
  })
}

/**
 * The show's current or next slot in the AzuraCast schedule, matched on its
 * `azuracastPlaylist` (case-insensitive, like the on-air match). Slots that
 * already ended are skipped in case the cached schedule went stale.
 */
export function useNextSlot(show: Pick<TShow, 'azuracastPlaylist'>): {
  slot: TScheduleSlot | undefined
  isPending: boolean
} {
  const { data, isPending } = useSchedule()
  const key = show.azuracastPlaylist?.trim().toLowerCase()
  if (!key) return { slot: undefined, isPending: false }
  const now = Date.now()
  const slot = data?.find(
    (s) => s.name.trim().toLowerCase() === key && Date.parse(s.end) > now,
  )
  return { slot, isPending }
}
