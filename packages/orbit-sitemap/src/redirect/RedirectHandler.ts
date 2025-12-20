import type { RedirectManager, RedirectRule, SitemapEntry } from '../types'

export type RedirectHandlingStrategy =
  | 'remove_old_add_new' // 移除舊 URL，加入新 URL（預設）
  | 'keep_relation' // 保留關聯，使用 canonical link
  | 'update_url' // 僅更新 URL
  | 'dual_mark' // 雙重標記

export interface RedirectHandlerOptions {
  manager: RedirectManager
  strategy: RedirectHandlingStrategy
  followChains?: boolean
  maxChainLength?: number
}

/**
 * 轉址處理器
 * 處理 sitemap entries 中的轉址
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
    const processedEntries: SitemapEntry[] = []
    const redirectMap = new Map<string, RedirectRule>()

    // 1. 解析所有轉址
    for (const entry of entries) {
      const redirect = await manager.resolve(entry.url, followChains, maxChainLength)
      if (redirect && redirect.from !== redirect.to) {
        redirectMap.set(entry.url, redirect)
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
