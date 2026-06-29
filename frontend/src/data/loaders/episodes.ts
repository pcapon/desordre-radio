import { createServerFn } from '@tanstack/react-start'
import { sdk } from '@/data/strapi-sdk'
import type {
  TEpisode,
  TStrapiResponseCollection,
  TStrapiResponseSingle,
} from '@/types/strapi'

const PAGE_SIZE = 9

const episodes = sdk.collection('episodes')

const EPISODE_POPULATE = ['cover', 'audio', 'show', 'show.cover']
const EPISODE_DETAIL_POPULATE = [
  'cover',
  'audio',
  'show',
  'show.cover',
  'blocks.file',
  'blocks.files',
]

const getEpisodes = async (page?: number, query?: string, show?: string) => {
  const filterConditions: Array<Record<string, unknown>> = []

  if (query) {
    filterConditions.push({
      $or: [
        { title: { $containsi: query } },
        { description: { $containsi: query } },
      ],
    })
  }

  if (show) {
    filterConditions.push({ show: { slug: { $eq: show } } })
  }

  const filters =
    filterConditions.length === 0
      ? undefined
      : filterConditions.length === 1
        ? filterConditions[0]
        : { $and: filterConditions }

  return episodes.find({
    sort: ['airedAt:desc', 'createdAt:desc'],
    pagination: { page: page || 1, pageSize: PAGE_SIZE },
    populate: EPISODE_POPULATE,
    filters,
  }) as Promise<TStrapiResponseCollection<TEpisode>>
}

const getEpisodeBySlug = async (slug: string) => {
  return episodes.find({
    filters: { slug: { $eq: slug } },
    populate: EPISODE_DETAIL_POPULATE,
  }) as Promise<TStrapiResponseCollection<TEpisode>>
}

export const getEpisodesData = createServerFn({ method: 'GET' })
  .validator((input?: { page?: number; query?: string; show?: string }) => input)
  .handler(async ({ data }): Promise<TStrapiResponseCollection<TEpisode>> => {
    return getEpisodes(data?.page, data?.query, data?.show)
  })

export const getEpisodeBySlugData = createServerFn({ method: 'GET' })
  .validator((slug: string) => slug)
  .handler(
    async ({ data: slug }): Promise<TStrapiResponseCollection<TEpisode>> => {
      return getEpisodeBySlug(slug)
    },
  )

export const getLatestEpisodesData = createServerFn({ method: 'GET' })
  .validator((limit?: number) => limit)
  .handler(async ({ data: limit }): Promise<TStrapiResponseCollection<TEpisode>> => {
    return episodes.find({
      sort: ['airedAt:desc', 'createdAt:desc'],
      pagination: { page: 1, pageSize: limit ?? 4 },
      populate: EPISODE_POPULATE,
    }) as Promise<TStrapiResponseCollection<TEpisode>>
  })

export type { TStrapiResponseSingle }
