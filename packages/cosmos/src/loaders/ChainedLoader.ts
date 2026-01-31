/**
 * @file packages/cosmos/src/loaders/ChainedLoader.ts
 * @module @gravito/cosmos/loaders
 * @description 組合多個載入器的鏈式載入器實現
 */

import type { TranslationMap } from '../I18nService'
import type { TranslationLoader, TranslationLoaderChain } from './TranslationLoader'

/**
 * 鏈式翻譯載入器
 *
 * 組合多個載入器,實現降級策略
 * 當第一個載入器失敗時,自動嘗試下一個載入器
 *
 * @public
 * @since 3.1.0
 *
 * @example
 * ```typescript
 * import { ChainedLoader, FileSystemLoader, RemoteLoader } from '@gravito/cosmos'
 *
 * const loader = new ChainedLoader([
 *   new FileSystemLoader({ baseDir: './lang' }),
 *   new RemoteLoader({ url: 'https://api.example.com/i18n/:locale' }),
 *   new MemoryLoader({ fallbackTranslations })
 * ])
 *
 * // 載入順序: FileSystem -> Remote -> Memory
 * const translations = await loader.load('zh-TW')
 * ```
 */
export class ChainedLoader implements TranslationLoaderChain {
  public readonly name: string
  private loaders: TranslationLoader[]
  private fallbackLoader?: TranslationLoader

  /**
   * 建立鏈式載入器實例
   *
   * @param loaders - 載入器陣列,按照優先順序排列
   * @param name - 載入器名稱 (可選)
   */
  constructor(loaders: TranslationLoader[], name?: string) {
    this.name = name || 'ChainedLoader'
    this.loaders = loaders
  }

  /**
   * 載入指定語言的翻譯資源
   *
   * 按順序嘗試每個載入器,直到成功載入或所有載入器都失敗
   *
   * @param locale - 語言代碼
   * @returns 翻譯資源,所有載入器都失敗則返回 null
   */
  async load(locale: string): Promise<TranslationMap | null> {
    // 嘗試每個載入器
    for (const loader of this.loaders) {
      try {
        const result = await loader.load(locale)
        if (result) {
          return result
        }
      } catch (_error) {}
    }

    // 所有載入器都失敗,嘗試備用載入器
    if (this.fallbackLoader) {
      return this.fallbackLoader.load(locale)
    }

    return null
  }

  /**
   * 設定備用載入器
   *
   * @param loader - 備用載入器
   * @returns 當前實例,支援鏈式調用
   */
  fallback(loader: TranslationLoader): TranslationLoaderChain {
    this.fallbackLoader = loader
    return this
  }

  /**
   * 在鏈的末尾新增載入器
   *
   * @param loader - 要新增的載入器
   * @returns 當前實例,支援鏈式調用
   */
  append(loader: TranslationLoader): ChainedLoader {
    this.loaders.push(loader)
    return this
  }

  /**
   * 在鏈的開頭插入載入器
   *
   * @param loader - 要插入的載入器
   * @returns 當前實例,支援鏈式調用
   */
  prepend(loader: TranslationLoader): ChainedLoader {
    this.loaders.unshift(loader)
    return this
  }

  /**
   * 取得載入器陣列
   *
   * @returns 載入器陣列的複本
   */
  getLoaders(): readonly TranslationLoader[] {
    return [...this.loaders]
  }
}
