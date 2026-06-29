import {
  getArticlesData,
  getArticleByIdData,
  getArticleBySlugData,
} from './articles'
import {
  getEpisodesData,
  getEpisodeBySlugData,
  getLatestEpisodesData,
} from './episodes'
import { getShowsData, getShowBySlugData } from './shows'

/**
 * Strapi API - Server functions for fetching data from Strapi.
 *
 * Usage in route loaders:
 * ```ts
 * import { strapiApi } from "@/data/loaders";
 *
 * export const Route = createFileRoute("/replay")({
 *   loader: async () => {
 *     const { data } = await strapiApi.episodes.getEpisodesData({ data: {} });
 *     return data;
 *   },
 * });
 * ```
 */
export const strapiApi = {
  articles: {
    getArticlesData,
    getArticleByIdData,
    getArticleBySlugData,
  },
  episodes: {
    getEpisodesData,
    getEpisodeBySlugData,
    getLatestEpisodesData,
  },
  shows: {
    getShowsData,
    getShowBySlugData,
  },
}
