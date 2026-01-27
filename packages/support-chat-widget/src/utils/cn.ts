import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * 合併 className 的工具函數
 *
 * 結合 clsx 和 tailwind-merge，處理條件類名和 Tailwind CSS 衝突
 *
 * @param inputs - 類名輸入（支援字串、物件、陣列、布林值）
 * @returns 合併後的類名字串
 *
 * @example
 * ```ts
 * cn('px-2 py-1', 'px-4') // => 'py-1 px-4' (後者覆蓋前者)
 * cn('foo', { bar: true, baz: false }) // => 'foo bar'
 * cn('foo', false && 'bar', 'baz') // => 'foo baz'
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
