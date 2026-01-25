import type { MetaConfig } from './interfaces'

/**
 * MetaTagBuilder generates standard HTML SEO tags.
 *
 * It supports standard titles, descriptions, keywords, canonical links,
 * and robots directives.
 *
 * @public
 * @since 3.0.0
 */
export class MetaTagBuilder {
  constructor(private config: MetaConfig) {}

  /**
   * Generates the standard HTML meta tags.
   *
   * @returns A string containing title, description, keywords, canonical, and robots tags.
   */
  build(): string {
    const tags: string[] = []

    if (this.config.title) {
      tags.push(`<title>${this.escape(this.config.title)}</title>`)
    }

    if (this.config.description) {
      tags.push(`<meta name="description" content="${this.escape(this.config.description)}">`)
    }

    if (this.config.keywords && this.config.keywords.length > 0) {
      tags.push(`<meta name="keywords" content="${this.escape(this.config.keywords.join(', '))}">`)
    }

    if (this.config.canonical) {
      tags.push(`<link rel="canonical" href="${this.escape(this.config.canonical)}">`)
    }

    if (this.config.robots) {
      tags.push(`<meta name="robots" content="${this.escape(this.config.robots)}">`)
    }

    return tags.join('\n')
  }

  private escape(str: string): string {
    return str.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }
}
