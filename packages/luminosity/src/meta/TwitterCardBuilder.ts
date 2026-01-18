import type { TwitterCardConfig } from './interfaces'

/**
 * TwitterCardBuilder generates `<meta name="twitter:...">` tags.
 *
 * It supports Twitter Card properties including card type, site handle,
 * creator handle, titles, descriptions, and images.
 *
 * @public
 * @since 3.0.0
 */
export class TwitterCardBuilder {
  constructor(private config: TwitterCardConfig) {}

  build(): string {
    const tags: string[] = []

    const tw = (name: string, content: string) => {
      tags.push(`<meta name="twitter:${name}" content="${this.escape(content)}">`)
    }

    if (this.config.card) {
      tw('card', this.config.card)
    }
    if (this.config.site) {
      tw('site', this.config.site)
    }
    if (this.config.creator) {
      tw('creator', this.config.creator)
    }
    if (this.config.title) {
      tw('title', this.config.title)
    }
    if (this.config.description) {
      tw('description', this.config.description)
    }
    if (this.config.image) {
      tw('image', this.config.image)
    }

    return tags.join('\n')
  }

  private escape(str: string): string {
    return str.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }
}
