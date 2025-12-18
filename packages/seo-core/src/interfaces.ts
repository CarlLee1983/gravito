import type { ChangeFreq } from './types'

export interface SitemapImage {
  url: string
  title?: string
  caption?: string
  license?: string
  geo_location?: string
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
