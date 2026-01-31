/**
 * @file packages/cosmos/src/HMRWatcher.ts
 * @module @gravito/cosmos/hmr
 * @description 翻譯檔案的熱重載 (Hot Module Replacement) 監視器
 *
 * ⚠️ **Node.js Only**
 *
 * HMR 功能依賴 Node.js 的 fs.watch，無法在 Edge Runtime 使用
 *
 * Edge Runtime 環境請使用 RemoteLoader 的 ETag 快取機制
 *
 * @since 3.1.0
 * @platform node
 */

import type { FSWatcher } from 'node:fs'
import { watch } from 'node:fs'
import { join } from 'node:path'
import { detectRuntime } from './runtime/detector'

/**
 * HMR 配置
 *
 * @public
 * @since 3.1.0
 */
export interface HMRConfig {
  /**
   * 是否啟用 HMR
   *
   * 建議僅在開發模式啟用
   *
   * @default false
   */
  enabled: boolean

  /**
   * 要監視的目錄路徑陣列
   *
   * @example ['/app/lang', '/app/i18n']
   */
  watchDirs: string[]

  /**
   * 防抖延遲 (毫秒)
   *
   * 避免短時間內多次觸發重新載入
   *
   * @default 300
   */
  debounce?: number

  /**
   * 要監視的檔案副檔名
   *
   * @default ['.json']
   */
  extensions?: string[]

  /**
   * 是否在檔案變更時顯示日誌
   *
   * @default true
   */
  verbose?: boolean
}

/**
 * 翻譯檔案變更事件
 *
 * @public
 * @since 3.1.0
 */
export interface TranslationChangeEvent {
  /** 變更的檔案路徑 */
  filePath: string
  /** 受影響的語言代碼 */
  locale: string
  /** 變更類型 */
  type: 'change' | 'rename'
}

/**
 * 變更監聽器函數
 *
 * @public
 * @since 3.1.0
 */
export type ChangeListener = (event: TranslationChangeEvent) => void | Promise<void>

/**
 * HMR 監視器
 *
 * 監視翻譯檔案的變更,並在檔案變更時觸發回調
 * 支援防抖、多目錄監視、副檔名篩選等功能
 *
 * @public
 * @since 3.1.0
 *
 * @example
 * ```typescript
 * const watcher = new HMRWatcher({
 *   enabled: true,
 *   watchDirs: ['./lang'],
 *   debounce: 300,
 *   verbose: true
 * })
 *
 * watcher.onChange(async ({ locale, filePath }) => {
 *   console.log(`Reloading ${locale} from ${filePath}`)
 *   await i18nManager.reloadLocale(locale)
 * })
 *
 * watcher.start()
 * ```
 */
export class HMRWatcher {
  private config: Required<HMRConfig>
  private watchers: FSWatcher[] = []
  private listeners: ChangeListener[] = []
  private debounceTimers = new Map<string, NodeJS.Timeout>()
  private isWatching = false

  /**
   * 建立 HMR 監視器實例
   *
   * @param config - HMR 配置
   */
  constructor(config: HMRConfig) {
    // 運行時檢查 - Edge 環境靜默失敗
    const runtime = detectRuntime()
    if (runtime === 'edge') {
      if (config.verbose ?? true) {
        console.warn(
          '[HMRWatcher] HMR is not supported in Edge Runtime. ' +
            'Consider using RemoteLoader with ETag caching instead.'
        )
      }
      // 靜默處理，不拋出錯誤
      this.config = {
        enabled: false, // 強制停用
        watchDirs: [],
        debounce: 300,
        extensions: ['.json'],
        verbose: false,
      }
      return
    }

    this.config = {
      enabled: config.enabled,
      watchDirs: config.watchDirs,
      debounce: config.debounce ?? 300,
      extensions: config.extensions ?? ['.json'],
      verbose: config.verbose ?? true,
    }
  }

  /**
   * 註冊變更監聽器
   *
   * @param listener - 監聽器函數
   * @returns 當前實例,支援鏈式調用
   */
  onChange(listener: ChangeListener): HMRWatcher {
    this.listeners.push(listener)
    return this
  }

  /**
   * 移除變更監聽器
   *
   * @param listener - 要移除的監聽器函數
   */
  removeListener(listener: ChangeListener): void {
    const index = this.listeners.indexOf(listener)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }

  /**
   * 開始監視
   */
  start(): void {
    if (!this.config.enabled) {
      return
    }

    if (this.isWatching) {
      console.warn('[HMRWatcher] Already watching')
      return
    }

    for (const dir of this.config.watchDirs) {
      try {
        const watcher = watch(dir, { recursive: false }, (eventType, filename) => {
          if (!filename) {
            return
          }

          // 檢查副檔名
          const hasValidExtension = this.config.extensions.some((ext) => filename.endsWith(ext))
          if (!hasValidExtension) {
            return
          }

          // 提取語言代碼 (假設檔案名稱為 {locale}.json)
          const locale = filename.replace(/\.[^/.]+$/, '')
          const filePath = join(dir, filename)

          this.handleChange({
            filePath,
            locale,
            type: eventType === 'rename' ? 'rename' : 'change',
          })
        })

        this.watchers.push(watcher)

        if (this.config.verbose) {
          console.log(`[HMRWatcher] Watching directory: ${dir}`)
        }
      } catch (error) {
        console.error(`[HMRWatcher] Failed to watch directory: ${dir}`, error)
      }
    }

    this.isWatching = true
  }

  /**
   * 停止監視
   */
  stop(): void {
    for (const watcher of this.watchers) {
      watcher.close()
    }

    this.watchers = []
    this.isWatching = false

    // 清除所有防抖計時器
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer)
    }
    this.debounceTimers.clear()

    if (this.config.verbose) {
      console.log('[HMRWatcher] Stopped watching')
    }
  }

  /**
   * 處理檔案變更事件
   *
   * @param event - 變更事件
   */
  private handleChange(event: TranslationChangeEvent): void {
    const key = `${event.locale}:${event.type}`

    // 清除舊的計時器
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key)!)
    }

    // 設定新的防抖計時器
    const timer = setTimeout(async () => {
      this.debounceTimers.delete(key)

      if (this.config.verbose) {
        console.log(`[HMRWatcher] File ${event.type}: ${event.filePath} (${event.locale})`)
      }

      // 通知所有監聽器
      for (const listener of this.listeners) {
        try {
          await listener(event)
        } catch (error) {
          console.error('[HMRWatcher] Error in change listener:', error)
        }
      }
    }, this.config.debounce)

    this.debounceTimers.set(key, timer)
  }

  /**
   * 檢查是否正在監視
   *
   * @returns 是否正在監視
   */
  isActive(): boolean {
    return this.isWatching
  }

  /**
   * 取得監視的目錄列表
   *
   * @returns 目錄路徑陣列
   */
  getWatchDirs(): readonly string[] {
    return [...this.config.watchDirs]
  }
}
