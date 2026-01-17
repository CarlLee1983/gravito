import { AnalyticsBuilder } from './AnalyticsBuilder'
import type { PageSeoConfig } from './interfaces'
import { JsonLdBuilder } from './JsonLdBuilder'
import { MetaTagBuilder } from './MetaTagBuilder'
import { OpenGraphBuilder } from './OpenGraphBuilder'
import { TwitterCardBuilder } from './TwitterCardBuilder'

/**
 * SeoMetadata orchestrates the generation of various SEO-related HTML tags.
 *
 * It combines standard meta tags, Open Graph, Twitter Cards, JSON-LD, and
 * analytics scripts into a single coherent output. It also handles fallback
 * logic between different tag sets (e.g., meta title -> OG title).
 *
 * @example
 * ```typescript
 * const metadata = new SeoMetadata(pageConfig);
 * const html = metadata.toString();
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class SeoMetadata {
  private metaBuilder: MetaTagBuilder
  private ogBuilder?: OpenGraphBuilder
  private twitterBuilder?: TwitterCardBuilder
  private jsonLdBuilder?: JsonLdBuilder
  private analyticsBuilder?: AnalyticsBuilder

  constructor(config: PageSeoConfig) {
    this.metaBuilder = new MetaTagBuilder(config.meta)

    if (config.og) {
      // Auto-fill fallback from meta if missing
      if (!config.og.title) {
        config.og.title = config.meta.title
      }
      if (!config.og.description && config.meta.description) {
        config.og.description = config.meta.description
      }
      this.ogBuilder = new OpenGraphBuilder(config.og)
    }

    if (config.twitter) {
      if (!config.twitter.title) {
        config.twitter.title = config.meta.title
      }
      if (!config.twitter.description && config.meta.description) {
        config.twitter.description = config.meta.description
      }
      this.twitterBuilder = new TwitterCardBuilder(config.twitter)
    }

    if (config.jsonLd) {
      this.jsonLdBuilder = new JsonLdBuilder(config.jsonLd)
    }

    if (config.analytics) {
      this.analyticsBuilder = new AnalyticsBuilder(config.analytics)
    }
  }

  toString(): string {
    const parts: string[] = []

    parts.push(this.metaBuilder.build())

    if (this.ogBuilder) {
      parts.push(this.ogBuilder.build())
    }

    if (this.twitterBuilder) {
      parts.push(this.twitterBuilder.build())
    }

    if (this.jsonLdBuilder) {
      parts.push(this.jsonLdBuilder.build())
    }

    if (this.analyticsBuilder) {
      parts.push(this.analyticsBuilder.build())
    }

    return parts.join('\n')
  }
}
