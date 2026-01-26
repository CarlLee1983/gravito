import type { OpenGraphConfig } from './interfaces'

/**
 * OpenGraphBuilder generates `<meta property="og:...">` tags.
 *
 * It supports standard Open Graph properties including titles, descriptions,
 * URLs, locales, and detailed image metadata.
 *
 * @public
 * @since 3.0.0
 */
export class OpenGraphBuilder {
  constructor(private config: OpenGraphConfig) {}

  /**
   * Generates the Open Graph meta tags.
   *
   * @returns A string containing all OG meta tags.
   */
  build(): string {
    const tags: string[] = []

    const og = (prop: string, content: string) => {
      tags.push(`<meta property="og:${prop}" content="${this.escape(content)}">`)
    }

    og('title', this.config.title)
    if (this.config.type) {
      og('type', this.config.type)
    }
    if (this.config.url) {
      og('url', this.config.url)
    }
    if (this.config.description) {
      og('description', this.config.description)
    }
    if (this.config.siteName) {
      og('site_name', this.config.siteName)
    }
    if (this.config.locale) {
      og('locale', this.config.locale)
    }

    if (this.config.alternateLocales) {
      for (const loc of this.config.alternateLocales) {
        og('locale:alternate', loc)
      }
    }

    if (this.config.image) {
      if (typeof this.config.image === 'string') {
        og('image', this.config.image)
      } else {
        og('image', this.config.image.url)
        if (this.config.image.width) {
          og('image:width', String(this.config.image.width))
        }
        if (this.config.image.height) {
          og('image:height', String(this.config.image.height))
        }
        if (this.config.image.alt) {
          og('image:alt', this.config.image.alt)
        }
      }
    }

    return tags.join('\n')
  }

  private escape(str: string): string {
    return str.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }
}
