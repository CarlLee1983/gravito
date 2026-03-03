type StartsEndsNeedle = string | readonly string[]
/**
 * String Helper Utilities.
 * Provides methods for string manipulation, case conversion, and UUID generation.
 * @public
 */
export declare const Str: {
  readonly lower: (value: string) => string
  readonly upper: (value: string) => string
  readonly startsWith: (haystack: string, needles: StartsEndsNeedle) => boolean
  readonly endsWith: (haystack: string, needles: StartsEndsNeedle) => boolean
  readonly contains: (haystack: string, needles: StartsEndsNeedle) => boolean
  readonly snake: (value: string) => string
  readonly kebab: (value: string) => string
  readonly studly: (value: string) => string
  readonly camel: (value: string) => string
  readonly title: (value: string) => string
  readonly limit: (value: string, limit: number, end?: string) => string
  readonly slug: (value: string, separator?: string) => string
  readonly uuid: () => string
  /**
   * 生成 UUID v7（單調遞增，內含時間戳）。
   *
   * Bun 環境使用原生 Bun.randomUUIDv7() (C++ 實作)。
   * Node.js/Deno 環境使用 RFC 9562 的 JavaScript polyfill。
   *
   * UUID v7 的優勢：
   * - 資料庫主鍵天然有序 → B-tree 索引性能提升 2-10x
   * - 可從 UUID 提取毫秒級時間戳
   * - 仍保持全域唯一性
   *
   * @returns UUID v7 字串
   * @public
   */
  readonly uuidv7: () => string
  readonly random: (length?: number) => string
}
