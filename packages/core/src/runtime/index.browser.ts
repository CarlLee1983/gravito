/**
 * Browser-safe runtime abstraction module.
 */

import { createUnknownAdapter } from './adapter-unknown'
import type { RuntimeAdapter, RuntimePasswordAdapter, RuntimeSqliteDatabase } from './types'

export * from './types'
export { getRuntimeEnv, getRuntimeKind } from './detection'

let runtimeAdapter: RuntimeAdapter | null = null

export function getRuntimeAdapter(): RuntimeAdapter {
  if (!runtimeAdapter) {
    runtimeAdapter = createUnknownAdapter()
  }
  return runtimeAdapter
}

let passwordAdapter: RuntimePasswordAdapter | null = null

export function getPasswordAdapter(): RuntimePasswordAdapter {
  if (!passwordAdapter) {
    const message = '[RuntimeAdapter] Password hashing is not supported in the browser'
    passwordAdapter = {
      async hash() { throw new Error(message) },
      async verify() { throw new Error(message) },
    }
  }
  return passwordAdapter
}

export async function createSqliteDatabase(_path: string): Promise<RuntimeSqliteDatabase> {
  throw new Error('[RuntimeAdapter] SQLite storage is not supported in the browser')
}

export async function archiveFromDirectory() { throw new Error('Not supported in browser') }
export function getArchiveAdapter() { throw new Error('Not supported in browser') }
export function getCompressionAdapter() { throw new Error('Not supported in browser') }
export function createHtmlRenderCallbacks() { throw new Error('Not supported in browser') }
export function getMarkdownAdapter() { throw new Error('Not supported in browser') }

// Deep Equals - Browser safe implementation
export function getDeepEquals() {
  return (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b)
}

// Escape - Browser safe
export function getEscapeHtml() {
  return (str: string) => str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m] || m))
}

/**
 * Convert various data types to Uint8Array.
 */
export async function toUint8Array(
  data: Blob | string | ArrayBuffer | Uint8Array
): Promise<Uint8Array> {
  if (data instanceof Uint8Array) return data
  if (typeof data === 'string') return new TextEncoder().encode(data)
  if (data instanceof ArrayBuffer) return new Uint8Array(data)
  if (data instanceof Blob) return new Uint8Array(await data.arrayBuffer())
  return new Uint8Array()
}
