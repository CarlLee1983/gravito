import type { ChangeFreq } from './types'

export interface SitemapImage {
  url: string
  title?: string
  caption?: string
  license?: string
  geo_location?: string
}

export interface SitemapVideo {
  thumbnail_loc: string
  title: string
  description: string
  content_loc?: string
  player_loc?: string
  duration?: number
  expiration_date?: string | Date
  rating?: number
  view_count?: number
  publication_date?: string | Date
  family_friendly?: 'yes' | 'no'
  live?: 'yes' | 'no'
}

export interface AlternateUrl {
  lang: string
  url: string
}

export interface SitemapEntry {
  url: string // Relative or absolute URL
  lastmod?: string | Date
  changefreq?: ChangeFreq
  priority?: number
  images?: SitemapImage[]
  videos?: SitemapVideo[]
  alternates?: AlternateUrl[] // For i18n
}

export interface SeoResolver {
  /** Unique identifier for this resolver (e.g., 'products', 'blog-posts') */
  name: string

  /** Fetch all URLs for this resolver */
  fetch: () => Promise<SitemapEntry[]> | SitemapEntry[]

  /** Optional: Priority for this resolver's entries (0.0 - 1.0) */
  priority?: number

  /** Optional: Change frequency hint */
  changefreq?: ChangeFreq
}
