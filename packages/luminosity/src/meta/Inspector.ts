import { LuminosityError } from '../errors/LuminosityError'
import { LuminosityErrorCodes } from '../errors/codes'

/**
 * Represents a summarized view of a page's SEO metadata.
 *
 * @public
 * @since 3.0.0
 */
export interface MetaPreview {
  /** The standard HTML title. */
  title?: string
  /** The standard meta description. */
  description?: string
  /** The URL of the page. */
  url?: string
  /** Extracted Open Graph metadata. */
  og?: {
    title?: string
    description?: string
    image?: string
    type?: string
    site_name?: string
  }
  /** Extracted Twitter Card metadata. */
  twitter?: {
    card?: string
    site?: string
    creator?: string
  }
}

/**
 * MetaInspector fetches and parses SEO metadata from any public URL.
 *
 * It extracts standard meta tags, Open Graph properties, and Twitter Cards
 * to provide a summary of how a page will appear when shared on social media
 * or indexed by search engines.
 *
 * @public
 * @since 3.0.0
 */
export class MetaInspector {
  /**
   * Fetches metadata for a given URL.
   *
   * Sends an HTTP GET request to the URL, retrieves the HTML content,
   * and extracts SEO metadata.
   *
   * @param url - The URL to inspect.
   * @returns A promise that resolves to the metadata preview.
   * @throws {Error} If the network request fails or returns a non-200 status.
   *
   * @example
   * ```typescript
   * const inspector = new MetaInspector();
   * const preview = await inspector.inspect('https://example.com');
   * ```
   */
  async inspect(url: string): Promise<MetaPreview> {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new LuminosityError(response.status, LuminosityErrorCodes.SEO_FETCH_FAILED, {
          message: `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
          retryable: true,
        })
      }
      const html = await response.text()
      return this.parse(html, url)
    } catch (error) {
      if (error instanceof Error) {
        throw new LuminosityError(500, LuminosityErrorCodes.SEO_INSPECTION_FAILED, {
          message: `Inspection failed: ${error.message}`,
          retryable: false,
        })
      }
      throw error
    }
  }

  /**
   * Parses HTML content to extract metadata.
   *
   * @param html - The raw HTML string.
   * @param url - The URL being parsed (for context).
   * @returns The extracted metadata preview.
   */
  parse(html: string, url: string): MetaPreview {
    const preview: MetaPreview = { url }

    // Helper to extract content content
    const getMeta = (name: string) => {
      // Create a regex that finds the meta tag with the specific name/property
      // and captures the content attribute value anywhere in the tag
      const pattern = new RegExp(
        `<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"]+)["']` +
          `|` +
          `<meta[^>]+content=["']([^"]+)["'][^>]*(?:name|property)=["']${name}["']`,
        'i'
      )
      const match = html.match(pattern)
      return match ? match[1] || match[2] : undefined
    }

    // Title
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i)
    preview.title = titleMatch ? titleMatch[1] : undefined

    // Description
    preview.description = getMeta('description')

    // OpenGraph
    preview.og = {
      title: getMeta('og:title'),
      description: getMeta('og:description'),
      image: getMeta('og:image'),
      type: getMeta('og:type'),
      site_name: getMeta('og:site_name'),
    }

    // Twitter
    preview.twitter = {
      card: getMeta('twitter:card'),
      site: getMeta('twitter:site'),
      creator: getMeta('twitter:creator'),
    }

    return preview
  }
}
