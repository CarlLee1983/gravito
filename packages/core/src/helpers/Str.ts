import { randomBytes, randomUUID } from '../compat/crypto'
import { getRuntimeKind } from '../runtime/detection'

type StartsEndsNeedle = string | readonly string[]

function splitWords(input: string): string[] {
  const normalized = input
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()

  return normalized ? normalized.split(/\s+/) : []
}

function capitalize(word: string): string {
  if (!word) {
    return word
  }
  return word.charAt(0).toUpperCase() + word.slice(1)
}

/**
 * String Helper Utilities.
 * Provides methods for string manipulation, case conversion, and UUID generation.
 * @public
 */
export const Str = {
  lower(value: string): string {
    return value.toLowerCase()
  },

  upper(value: string): string {
    return value.toUpperCase()
  },

  startsWith(haystack: string, needles: StartsEndsNeedle): boolean {
    const list = Array.isArray(needles) ? needles : [needles]
    for (const needle of list) {
      if (needle !== '' && haystack.startsWith(needle)) {
        return true
      }
    }
    return false
  },

  endsWith(haystack: string, needles: StartsEndsNeedle): boolean {
    const list = Array.isArray(needles) ? needles : [needles]
    for (const needle of list) {
      if (needle !== '' && haystack.endsWith(needle)) {
        return true
      }
    }
    return false
  },

  contains(haystack: string, needles: StartsEndsNeedle): boolean {
    const list = Array.isArray(needles) ? needles : [needles]
    for (const needle of list) {
      if (needle !== '' && haystack.includes(needle)) {
        return true
      }
    }
    return false
  },

  snake(value: string): string {
    const words = splitWords(value).map((w) => w.toLowerCase())
    return words.join('_')
  },

  kebab(value: string): string {
    const words = splitWords(value).map((w) => w.toLowerCase())
    return words.join('-')
  },

  studly(value: string): string {
    return splitWords(value)
      .map((w) => capitalize(w.toLowerCase()))
      .join('')
  },

  camel(value: string): string {
    const words = splitWords(value).map((w) => w.toLowerCase())
    if (words.length === 0) {
      return ''
    }
    const first = words[0]
    if (first === undefined) {
      return ''
    }
    return first + words.slice(1).map(capitalize).join('')
  },

  title(value: string): string {
    return splitWords(value)
      .map((w) => capitalize(w.toLowerCase()))
      .join(' ')
  },

  limit(value: string, limit: number, end = '...'): string {
    if (limit < 0) {
      return ''
    }
    if (value.length <= limit) {
      return value
    }
    return value.slice(0, limit) + end
  },

  slug(value: string, separator = '-'): string {
    const normalized = value
      .normalize('NFKD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()

    const escaped = separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return normalized
      .replace(/[^a-z0-9]+/g, separator)
      .replace(new RegExp(`^${escaped}+|${escaped}+$`, 'g'), '')
  },

  uuid(): string {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
      return globalThis.crypto.randomUUID()
    }
    return randomUUID()
  },

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
  uuidv7(): string {
    const runtime = getRuntimeKind()
    if (runtime === 'bun' && typeof Bun !== 'undefined' && typeof Bun.randomUUIDv7 === 'function') {
      return Bun.randomUUIDv7()
    }
    return generateUUIDv7Fallback()
  },

  random(length = 16): string {
    if (length <= 0) {
      return ''
    }
    // base64url: [A-Za-z0-9_-]
    const bytes = randomBytes(Math.ceil((length * 3) / 4) + 2)
    const str = bytes.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
    return str.slice(0, length)
  },
} as const

/**
 * RFC 9562 UUID v7 的 JavaScript polyfill。
 *
 * UUID v7 格式 (128 bits):
 * - 時間戳：unix_ms (48 bits) → bytes[0-5]
 * - 亂數：12 bits → bytes[6-7] (upper 4 bits)
 * - 版本：0111 (v7) → bytes[6] 上 4 bits
 * - 亂數：62 bits → bytes[7-15]
 * - Variant：10xx → bytes[8] 上 2 bits (RFC 4122)
 *
 * @internal
 */
function generateUUIDv7Fallback(): string {
  // 獲取當前毫秒級時間戳
  const timestamp = Date.now()

  // 建立 16 bytes 的 Uint8Array
  const bytes = new Uint8Array(16)

  // 填充前 6 bytes：時間戳 (big-endian)
  bytes[0] = (timestamp >>> 40) & 0xff
  bytes[1] = (timestamp >>> 32) & 0xff
  bytes[2] = (timestamp >>> 24) & 0xff
  bytes[3] = (timestamp >>> 16) & 0xff
  bytes[4] = (timestamp >>> 8) & 0xff
  bytes[5] = timestamp & 0xff

  // 填充後 10 bytes：隨機數
  const randomPart = randomBytes(10)
  for (let i = 0; i < 10; i += 1) {
    bytes[6 + i] = randomPart[i] ?? 0
  }

  // 設定 version bits：byte[6] 的上 4 bits = 0111 (v7)
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70

  // 設定 variant bits：byte[8] 的上 2 bits = 10 (RFC 4122)
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80

  // 格式化為標準 UUID 字串 (8-4-4-4-12)
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-')
}
