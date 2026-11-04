import { createServerFn } from '@tanstack/react-start'
import { sdk } from '@/data/strapi-sdk'
import { nextDay, stationTimeToDate } from '@/lib/format'
import type {
  TEpisode,
  TStrapiResponseCollection,
  TStrapiResponseSingle,
} from '@/types/strapi'

const PAGE_SIZE = 9

const episodes = sdk.collection('episodes')

const EPISODE_POPULATE = ['cover', 'show', 'show.cover']
const EPISODE_DETAIL_POPULATE = [
  'cover',
  'show',
  'show.cover',
  'blocks.file',
  'blocks.files',
]

/** Assumed length of an episode with no duration, for "on air at" searches. */
const DEFAULT_DURATION_S = 2 * 3600
/** An episode starting this soon after the searched time still matches. */
const EARLY_START_MS = 15 * 60 * 1000

type EpisodesQuery = {
  page?: number
  query?: string
  show?: string
  /** Air day, "YYYY-MM-DD" in the station time zone. */
  date?: string
  /** Air time, "HH:MM" in the station time zone; only used with `date`. */
  time?: string
}

const getEpisodes = async ({ page, query, show, date, time }: EpisodesQuery) => {
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

  if (date) {
    filterConditions.push({
      airedAt: {
        $gte: stationTimeToDate(date).toISOString(),
        $lt: stationTimeToDate(nextDay(date)).toISOString(),
      },
    })
  }

  const filters =
    filterConditions.length === 0
      ? undefined
      : filterConditions.length === 1
        ? filterConditions[0]
        : { $and: filterConditions }

  if (date && time) return onAirAt(filters, stationTimeToDate(date, time))

  return episodes.find({
    sort: ['airedAt:desc', 'createdAt:desc'],
    pagination: { page: page || 1, pageSize: PAGE_SIZE },
    populate: EPISODE_POPULATE,
    filters,
  }) as Promise<TStrapiResponseCollection<TEpisode>>
}

/**
 * Episodes of one day that were on air at `at`. Strapi can't filter on
 * airedAt + duration, so the day's episodes (a handful) are fetched and
 * narrowed here, unpaginated.
 */
const onAirAt = async (
  filters: Record<string, unknown> | undefined,
  at: Date,
): Promise<TStrapiResponseCollection<TEpisode>> => {
  const res = (await episodes.find({
    sort: ['airedAt:asc'],
    pagination: { page: 1, pageSize: 100 },
    populate: EPISODE_POPULATE,
    filters,
  })) as TStrapiResponseCollection<TEpisode>
  const t = at.getTime()
  const data = (res.data ?? []).filter((episode) => {
    if (!episode.airedAt) return false
    const start = new Date(episode.airedAt).getTime()
    const end = start + (episode.duration || DEFAULT_DURATION_S) * 1000
    return start - EARLY_START_MS <= t && t < end
  })
  return {
    ...res,
    data,
    meta: {
      pagination: { page: 1, pageSize: data.length, pageCount: 1, total: data.length },
    },
  }
}

const getEpisodeBySlug = async (slug: string) => {
  return episodes.find({
    filters: { slug: { $eq: slug } },
    populate: EPISODE_DETAIL_POPULATE,
  }) as Promise<TStrapiResponseCollection<TEpisode>>
}

export const getEpisodesData = createServerFn({ method: 'GET' })
  .validator((input?: EpisodesQuery) => input)
  .handler(async ({ data }): Promise<TStrapiResponseCollection<TEpisode>> => {
    return getEpisodes(data ?? {})
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
