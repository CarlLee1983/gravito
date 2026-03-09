// @ts-nocheck
/**
 * 環境檢測工具
 *
 * 為了避免在前端包中引入 Node.js 類型，我們使用這種方式來檢測環境。
 */

const viteDev = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.DEV : false

const proc = typeof globalThis !== 'undefined' ? (globalThis as any).process : undefined

// 兼容不同的環境檢測方式
export const isDev = viteDev || proc?.env?.NODE_ENV === 'development'

export const isTest =
  (typeof globalThis !== 'undefined' && typeof (globalThis as any).vitest !== 'undefined') ||
  proc?.env?.NODE_ENV === 'test'
