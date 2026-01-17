import type { JsonLdConfig } from './interfaces'

/**
 * JsonLdBuilder generates structured data scripts in JSON-LD format.
 *
 * It automatically adds the `@context` and handles script tag escaping
 * to prevent XSS and broken HTML.
 *
 * @public
 * @since 3.0.0
 */
export class JsonLdBuilder {
  constructor(private config: JsonLdConfig | JsonLdConfig[]) {}

  build(): string {
    const payload = Array.isArray(this.config)
      ? this.config.map((c) => this.format(c))
      : this.format(this.config)

    const jsonStr = JSON.stringify(payload).replace(/<\/script>/g, '<\\/script>')

    return `<script type="application/ld+json">${jsonStr}</script>`
  }

  private format(config: JsonLdConfig): Record<string, unknown> {
    return {
      '@context': 'https://schema.org',
      '@type': config.type,
      ...config.data,
    }
  }
}
