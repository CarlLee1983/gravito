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
   * 處理 entries 中的轉址
   */
  async processEntries(entries: SitemapEntry[]): Promise<SitemapEntry[]> {
    const { manager, strategy, followChains, maxChainLength } = this.options
    const _processedEntries: SitemapEntry[] = []
    const redirectMap = new Map<string, RedirectRule>()

    // 1. 解析所有轉址
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

    // 2. 根據策略處理
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
   * 策略一：移除舊 URL，加入新 URL
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
        // 標記為已處理
        redirectedUrls.add(entry.url)
        // 創建新 entry
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
        // 只添加未轉址的 entry
        processed.push(entry)
      }
    }

    return processed
  }

  /**
   * 策略二：保留關聯，使用 canonical link
   */
  private handleKeepRelation(
    entries: SitemapEntry[],
    redirectMap: Map<string, RedirectRule>
  ): SitemapEntry[] {
    const processed: SitemapEntry[] = []

    for (const entry of entries) {
      const redirect = redirectMap.get(entry.url)
      if (redirect) {
        // 保留舊 URL，但標記 canonical
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
   * 策略三：僅更新 URL
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
   * 策略四：雙重標記
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
        // 保留舊 URL（標記轉址）
        processed.push({
          ...entry,
          redirect: {
            from: redirect.from,
            to: redirect.to,
            type: redirect.type,
          },
        })

        // 添加新 URL（如果尚未添加）
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
