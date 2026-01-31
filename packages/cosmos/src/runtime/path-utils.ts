/**
 * @file packages/cosmos/src/runtime/path-utils.ts
 * @module @gravito/cosmos/runtime
 * @description Edge-compatible path 工具函數
 *
 * 提供與 Node.js path 模組相似的功能,但不依賴 Node.js API
 * 適用於 Edge Runtime 環境
 */

/**
 * Edge-compatible path 工具集
 *
 * @public
 * @since 3.2.0
 */
export const pathUtils = {
  /**
   * 將多個路徑片段連接成一個路徑
   *
   * @param parts - 路徑片段
   * @returns 連接後的路徑
   *
   * @example
   * ```typescript
   * pathUtils.join('foo', 'bar', 'baz.txt') // 'foo/bar/baz.txt'
   * pathUtils.join('/foo', '/bar/') // '/foo/bar'
   * pathUtils.join('', 'foo', '', 'bar') // 'foo/bar'
   * ```
   */
  join(...parts: string[]): string {
    return parts
      .filter(Boolean) // 移除空字串
      .join('/')
      .replace(/\/+/g, '/') // 將多個斜線替換為單個斜線
      .replace(/\/$/, '') // 移除尾部斜線
      .replace(/^\/+/, '/') // 確保開頭只有一個斜線(如果有的話)
  },

  /**
   * 返回路徑的最後一部分
   *
   * @param path - 路徑
   * @param ext - 要移除的副檔名(可選)
   * @returns 路徑的基本名稱
   *
   * @example
   * ```typescript
   * pathUtils.basename('/foo/bar/baz.txt') // 'baz.txt'
   * pathUtils.basename('/foo/bar/baz.txt', '.txt') // 'baz'
   * pathUtils.basename('/foo/bar/') // 'bar'
   * ```
   */
  basename(path: string, ext?: string): string {
    // 移除尾部斜線
    const normalized = path.replace(/\/$/, '')
    // 取得最後一個片段
    const base = normalized.split('/').pop() || ''

    if (ext && base.endsWith(ext)) {
      return base.slice(0, -ext.length)
    }
    return base
  },

  /**
   * 返回路徑的目錄部分
   *
   * @param path - 路徑
   * @returns 目錄路徑
   *
   * @example
   * ```typescript
   * pathUtils.dirname('/foo/bar/baz.txt') // '/foo/bar'
   * pathUtils.dirname('/foo') // '/'
   * pathUtils.dirname('foo/bar') // 'foo'
   * ```
   */
  dirname(path: string): string {
    const parts = path.split('/')
    parts.pop() // 移除最後一個片段
    const result = parts.join('/')
    return result || (path.startsWith('/') ? '/' : '.')
  },

  /**
   * 返回路徑的副檔名
   *
   * @param path - 路徑
   * @returns 副檔名(包含點號)
   *
   * @example
   * ```typescript
   * pathUtils.extname('index.html') // '.html'
   * pathUtils.extname('index.coffee.md') // '.md'
   * pathUtils.extname('index.') // '.'
   * pathUtils.extname('index') // ''
   * ```
   */
  extname(path: string): string {
    const match = path.match(/\.[^./]*$/)
    return match ? match[0] : ''
  },

  /**
   * 檢查路徑是否為絕對路徑
   *
   * @param path - 路徑
   * @returns 是否為絕對路徑
   *
   * @example
   * ```typescript
   * pathUtils.isAbsolute('/foo/bar') // true
   * pathUtils.isAbsolute('foo/bar') // false
   * pathUtils.isAbsolute('C:/foo/bar') // true (Windows)
   * ```
   */
  isAbsolute(path: string): boolean {
    // Unix-style absolute path
    if (path.startsWith('/')) {
      return true
    }
    // Windows-style absolute path (C:/, D:/, etc.)
    if (/^[a-zA-Z]:[\\/]/.test(path)) {
      return true
    }
    return false
  },

  /**
   * 正規化路徑
   *
   * 解析 `.` 和 `..` 片段
   *
   * @param path - 路徑
   * @returns 正規化後的路徑
   *
   * @example
   * ```typescript
   * pathUtils.normalize('/foo/bar//baz/./qux/../quux') // '/foo/bar/baz/quux'
   * pathUtils.normalize('foo/../bar') // 'bar'
   * ```
   */
  normalize(path: string): string {
    const isAbs = this.isAbsolute(path)
    const parts = path.split('/').filter(Boolean)
    const result: string[] = []

    for (const part of parts) {
      if (part === '.') {
      } else if (part === '..') {
        // 返回上一級目錄
        if (result.length > 0 && result[result.length - 1] !== '..') {
          result.pop()
        } else if (!isAbs) {
          // 相對路徑可以保留 ..
          result.push('..')
        }
      } else {
        result.push(part)
      }
    }

    let normalized = result.join('/')
    if (isAbs) {
      normalized = `/${normalized}`
    }
    return normalized || (isAbs ? '/' : '.')
  },
}
