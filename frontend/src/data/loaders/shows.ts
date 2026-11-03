import { createServerFn } from '@tanstack/react-start'
import { sdk } from '@/data/strapi-sdk'
import type {
  TShow,
  TStrapiResponseCollection,
} from '@/types/strapi'

const shows = sdk.collection('shows')

/** Latest air date among a show's episodes (falls back to publish date). */
function lastAiredAt(episodes: TShow['episodes']): string | undefined {
  let latest: string | undefined
  for (const ep of episodes ?? []) {
    const d = ep.airedAt || ep.publishedAt
    if (d && (!latest || d > latest)) latest = d
  }
  return latest
}

/**
 * All shows, most recently aired first (shows without replays last, by
 * title). Strapi can't sort on an aggregate of a relation, so episodes come
 * back with only their dates and the order is computed here.
 */
export const getShowsData = createServerFn({ method: 'GET' }).handler(
  async (): Promise<TStrapiResponseCollection<TShow>> => {
    const res = (await shows.find({
      sort: ['title:asc'],
      pagination: { page: 1, pageSize: 100 },
      populate: {
        cover: true,
        episodes: { fields: ['airedAt', 'publishedAt'] },
      },
    })) as TStrapiResponseCollection<TShow>

    const sorted = (res.data ?? [])
      .map(({ episodes, ...show }) => ({
        ...show,
        episodeCount: episodes?.length ?? 0,
        lastAiredAt: lastAiredAt(episodes),
      }))
      .sort((a, b) => {
        if (a.lastAiredAt === b.lastAiredAt) return 0
        if (!a.lastAiredAt) return 1
        if (!b.lastAiredAt) return -1
        return a.lastAiredAt < b.lastAiredAt ? 1 : -1
      })

    return { ...res, data: sorted }
  },
)

export const getShowBySlugData = createServerFn({ method: 'GET' })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }): Promise<TStrapiResponseCollection<TShow>> => {
    return shows.find({
      filters: { slug: { $eq: slug } },
      populate: ['cover'],
    }) as Promise<TStrapiResponseCollection<TShow>>
  })
