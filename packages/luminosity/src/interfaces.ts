import type { ChangeFreq } from './types'

/**
 * Metadata for an image included in a sitemap.
 *
 * @public
 * @since 3.0.0
 */
export interface SitemapImage {
  /** The full URL of the image. */
  url: string
  /** The title of the image. */
  title?: string
  /** A caption for the image. */
  caption?: string
  /** A URL to the license for the image. */
  license?: string
  /** The geographic location of the image. */
  geo_location?: string
}

/**
 * Metadata for a video included in a sitemap.
 *
 * @public
 * @since 3.0.0
 */
export interface SitemapVideo {
  /** The URL of the video thumbnail. */
  thumbnail_loc: string
  /** The title of the video. */
  title: string
  /** A description of the video. */
  description: string
  /** The URL of the actual video file. */
  content_loc?: string
  /** The URL of the video player. */
  player_loc?: string
  /** Duration of the video in seconds. */
  duration?: number
  /** When the video will no longer be available. */
  expiration_date?: string | Date
  /** Rating of the video (0.0 to 5.0). */
  rating?: number
  /** Number of times the video has been viewed. */
  view_count?: number
  /** When the video was first published. */
  publication_date?: string | Date
  /** Whether the video is suitable for children. */
  family_friendly?: 'yes' | 'no'
  /** Whether the video is a live stream. */
  live?: 'yes' | 'no'
}

/**
 * Represents an alternate language or regional version of a URL.
 *
 * @public
 * @since 3.0.0
 */
export interface AlternateUrl {
  /** The language code (e.g., 'en', 'zh-TW') or 'x-default'. */
  lang: string
  /** The full URL of the alternate version. */
  url: string
}

/**
 * Represents a single URL entry in an XML sitemap.
 *
 * @public
 * @since 3.0.0
 */
export interface SitemapEntry {
  /** The URL of the page (relative or absolute). */
  url: string
  /** The date of last modification. */
  lastmod?: string | Date
  /** How frequently the page is likely to change. */
  changefreq?: ChangeFreq
  /** The priority of this URL relative to other URLs on your site (0.0 to 1.0). */
  priority?: number
  /** Image metadata associated with this URL. */
  images?: SitemapImage[]
  /** Video metadata associated with this URL. */
  videos?: SitemapVideo[]
  /** Alternate language or regional versions of this URL. */
  alternates?: AlternateUrl[]
}

/**
 * Interface for data resolvers that provide URL entries to the SEO engine.
 *
 * @public
 * @since 3.0.0
 */
export interface SeoResolver {
  /** Unique identifier for this resolver (e.g., 'products', 'blog-posts'). */
  name: string

  /**
   * Fetch all URL entries provided by this resolver.
   *
   * @returns A promise that resolves to an array of sitemap entries.
   */
  fetch: () => Promise<SitemapEntry[]> | SitemapEntry[]

  /** Optional default priority for entries from this resolver (0.0 to 1.0). */
  priority?: number

  /** Optional default change frequency hint for entries from this resolver. */
  changefreq?: ChangeFreq
}
