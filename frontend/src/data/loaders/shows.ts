import { createServerFn } from '@tanstack/react-start'
import { sdk } from '@/data/strapi-sdk'
import type {
  TShow,
  TStrapiResponseCollection,
} from '@/types/strapi'

const shows = sdk.collection('shows')

export const getShowsData = createServerFn({ method: 'GET' })
  .handler(async (): Promise<TStrapiResponseCollection<TShow>> => {
    return shows.find({
      sort: ['title:asc'],
      pagination: { page: 1, pageSize: 50 },
      populate: ['cover'],
    }) as Promise<TStrapiResponseCollection<TShow>>
  })

export const getShowBySlugData = createServerFn({ method: 'GET' })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }): Promise<TStrapiResponseCollection<TShow>> => {
    return shows.find({
      filters: { slug: { $eq: slug } },
      populate: ['cover', 'episodes', 'episodes.cover', 'episodes.audio'],
    }) as Promise<TStrapiResponseCollection<TShow>>
  })
