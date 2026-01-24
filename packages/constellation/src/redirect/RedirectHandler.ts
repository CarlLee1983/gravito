import type { RedirectManager, RedirectRule, SitemapEntry } from '../types'

/**
 * Strategies for handling URLs that have redirects in the sitemap.
 *
 * @public
 * @since 3.0.0
 */
export type RedirectHandlingStrategy =
  /** Replace the old URL with the final destination URL. (Default) */
  | 'remove_old_add_new'
  /** Keep the old URL in the sitemap but mark the final destination as canonical. */
  | 'keep_relation'
  /** Silently update the URL to the destination without extra metadata. */
  | 'update_url'
  /** Include both the original and destination URLs in the sitemap. */
  | 'dual_mark'

/**
 * Options for configuring the `RedirectHandler`.
 *
 * @public
 * @since 3.0.0
 */
export interface RedirectHandlerOptions {
  /** The redirect manager used to resolve rules. */
  manager: RedirectManager
  /** The strategy to use when a redirect is found. */
  strategy: RedirectHandlingStrategy
  /** Whether to follow redirect chains to the final destination. @default false */
  followChains?: boolean
  /** Maximum number of redirect jumps to follow. @default 5 */
  maxChainLength?: number
}

/**
 * RedirectHandler processes sitemap entries to ensure they handle 301/302 redirects correctly.
 *
 * It uses a `RedirectManager` to resolve final destinations and applies one of
 * the supported `RedirectHandlingStrategy` options to the entry list.
 *
 * @public
 * @since 3.0.0
 */
export class RedirectHandler {
  private options: RedirectHandlerOptions

  constructor(options: RedirectHandlerOptions) {
    this.options = options
  }

  /**
   * Processes a list of sitemap entries and handles redirects according to the configured strategy.
   *
   * @param entries - The original list of sitemap entries.
   * @returns A promise resolving to the processed list of entries.
   */
  async processEntries(entries: SitemapEntry[]): Promise<SitemapEntry[]> {
    const { manager, strategy, followChains, maxChainLength } = this.options
    const _processedEntries: SitemapEntry[] = []
    const redirectMap = new Map<string, RedirectRule>()

    // 1. Resolve all redirects
    for (const entry of entries) {
      const redirectTarget = await manager.resolve(entry.url, followChains, maxChainLength)
      if (redirectTarget && entry.url !== redirectTarget) {
        redirectMap.set(entry.url, {
          from: entry.url,
          to: redirectTarget,
          type: 301, // Default to 301 for resolved chains
        })
      }
    }

    // 2. Handle according to strategy
    switch (strategy) {
      case 'remove_old_add_new':
        return this.handleRemoveOldAddNew(entries, redirectMap)
      case 'keep_relation':
        return this.handleKeepRelation(entries, redirectMap)
      case 'update_url':
        return this.handleUpdateUrl(entries, redirectMap)
      case 'dual_mark':
        return this.handleDualMark(entries, redirectMap)
      default:
        return entries
    }
  }

  /**
   * Strategy 1: Remove old URL and add the new destination URL.
   */
  private handleRemoveOldAddNew(
    entries: SitemapEntry[],
    redirectMap: Map<string, RedirectRule>
  ): SitemapEntry[] {
    const processed: SitemapEntry[] = []
    const redirectedUrls = new Set<string>()

    for (const entry of entries) {
      const redirect = redirectMap.get(entry.url)
      if (redirect) {
        // Mark as processed
        redirectedUrls.add(entry.url)
        // Create new entry
        processed.push({
          ...entry,
          url: redirect.to,
          redirect: {
            from: redirect.from,
            to: redirect.to,
            type: redirect.type,
          },
        })
      } else if (!redirectedUrls.has(entry.url)) {
        // Only add non-redirected entries
        processed.push(entry)
      }
    }

    return processed
  }

  /**
   * Strategy 2: Keep the original URL but mark the destination as canonical.
   */
  private handleKeepRelation(
    entries: SitemapEntry[],
    redirectMap: Map<string, RedirectRule>
  ): SitemapEntry[] {
    const processed: SitemapEntry[] = []

    for (const entry of entries) {
      const redirect = redirectMap.get(entry.url)
      if (redirect) {
        // Keep old URL but mark canonical
        processed.push({
          ...entry,
          redirect: {
            from: redirect.from,
            to: redirect.to,
            type: redirect.type,
            canonical: redirect.to,
          },
        })
      } else {
        processed.push(entry)
      }
    }

    return processed
  }

  /**
   * Strategy 3: Silently update the URL to the destination.
   */
  private handleUpdateUrl(
    entries: SitemapEntry[],
    redirectMap: Map<string, RedirectRule>
  ): SitemapEntry[] {
    return entries.map((entry) => {
      const redirect = redirectMap.get(entry.url)
      if (redirect) {
        return {
          ...entry,
          url: redirect.to,
          redirect: {
            from: redirect.from,
            to: redirect.to,
            type: redirect.type,
          },
        }
      }
      return entry
    })
  }

  /**
   * Strategy 4: Include both the original and destination URLs.
   */
  private handleDualMark(
    entries: SitemapEntry[],
    redirectMap: Map<string, RedirectRule>
  ): SitemapEntry[] {
    const processed: SitemapEntry[] = []
    const addedUrls = new Set<string>()

    for (const entry of entries) {
      const redirect = redirectMap.get(entry.url)
      if (redirect) {
        // Keep old URL (marked as redirect)
        processed.push({
          ...entry,
          redirect: {
            from: redirect.from,
            to: redirect.to,
            type: redirect.type,
          },
        })

        // Add new URL (if not already added)
        if (!addedUrls.has(redirect.to)) {
          processed.push({
            ...entry,
            url: redirect.to,
            redirect: {
              from: redirect.from,
              to: redirect.to,
              type: redirect.type,
            },
          })
          addedUrls.add(redirect.to)
        }
      } else {
        processed.push(entry)
      }
    }

    return processed
  }
}
