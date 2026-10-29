import { useQuery } from '@tanstack/react-query'
import { strapiApi } from '@/data/loaders'
import type { TShow } from '@/types/strapi'

/** The Strapi show whose `azuracastPlaylist` matches the playlist on air. */
export function useOnAirShow(playlist: string | undefined): TShow | undefined {
  const { data: shows } = useQuery({
    queryKey: ['shows', 'on-air'],
    queryFn: async () => (await strapiApi.shows.getShowsData()).data,
    staleTime: 5 * 60_000,
    enabled: Boolean(playlist),
  })

  const key = playlist?.trim().toLowerCase()
  if (!key) return undefined
  return shows?.find((s) => s.azuracastPlaylist?.trim().toLowerCase() === key)
}
