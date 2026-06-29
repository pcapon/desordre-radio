/**
 * Strapi type definitions
 * These types match the Strapi Cloud Template Blog schema
 */

import type { Block } from '@/components/blocks'

// Base image type from Strapi media library
export type TImage = {
  id: number
  documentId: string
  alternativeText: string | null
  url: string
}

// Author content type
export type TAuthor = {
  id: number
  documentId: string
  name: string
  email?: string
  createdAt: string
  updatedAt: string
  publishedAt: string
}

// Category content type
export type TCategory = {
  id: number
  documentId: string
  name: string
  slug: string
  description?: string
  createdAt: string
  updatedAt: string
  publishedAt: string
}

// Article content type
export type TArticle = {
  id: number
  documentId: string
  title: string
  description: string
  slug: string
  cover?: TImage
  author?: TAuthor
  category?: TCategory
  blocks?: Array<Block>
  createdAt: string
  updatedAt: string
  publishedAt: string
}

// Uploaded media (audio) from the Strapi media library
export type TMedia = {
  id: number
  documentId: string
  url: string
  mime?: string
  name?: string
  size?: number
}

// Radio show content type (a recurring program)
export type TShow = {
  id: number
  documentId: string
  title: string
  slug: string
  description?: string
  host?: string
  /** Optional human-readable schedule, e.g. "Jeudi 20h". */
  schedule?: string
  cover?: TImage
  episodes?: Array<TEpisode>
  createdAt: string
  updatedAt: string
  publishedAt: string
}

// Replay episode content type (an on-demand recording)
export type TEpisode = {
  id: number
  documentId: string
  title: string
  slug: string
  description?: string
  /** External audio URL (e.g. a CDN-hosted mp3). Preferred when present. */
  audioUrl?: string
  /** Uploaded audio file via the Strapi media library. */
  audio?: TMedia
  /** Duration in seconds. */
  duration?: number
  /** When the episode originally aired (ISO date). */
  airedAt?: string
  cover?: TImage
  show?: TShow
  blocks?: Array<Block>
  createdAt: string
  updatedAt: string
  publishedAt: string
}

// Strapi response wrappers
export type TStrapiResponseSingle<T> = {
  data: T
  meta?: {
    pagination?: TStrapiPagination
  }
}

export type TStrapiResponseCollection<T> = {
  data: Array<T>
  meta?: {
    pagination?: TStrapiPagination
  }
}

export type TStrapiPagination = {
  page: number
  pageSize: number
  pageCount: number
  total: number
}

export type TStrapiError = {
  status: number
  name: string
  message: string
  details?: Record<string, Array<string>>
}

export type TStrapiResponse<T = null> = {
  data?: T
  error?: TStrapiError
  meta?: {
    pagination?: TStrapiPagination
  }
}
