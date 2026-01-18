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
  async inspect(url: string): Promise<MetaPreview> {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
      }
      const html = await response.text()
      return this.parse(html, url)
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Inspection failed: ${error.message}`)
      }
      throw error
    }
  }

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
