/**
 * Runtime detection utilities.
 *
 * @module runtime/detection
 * @since 3.2.0
 */

import type { RuntimeKind } from './types'

/**
 * Minimal type interface for the Deno global used in runtime detection.
 * Avoids `any` while remaining compatible with globalThis access.
 * @internal
 */
interface DenoGlobal {
  version?: { deno?: string }
  env?: { toObject?: () => Record<string, string> }
  spawn?: unknown
  Command?: unknown
  writeFile?: unknown
  readFile?: unknown
  stat?: unknown
  remove?: unknown
  mkdir?: unknown
  readDir?: unknown
}

/**
 * Detect the current JavaScript runtime environment.
 * @internal
 */
export function getRuntimeKind(): RuntimeKind {
  if (typeof Bun !== 'undefined' && typeof Bun.spawn === 'function') {
    return 'bun'
  }
  const denoRuntime = (globalThis as unknown as { Deno?: DenoGlobal }).Deno
  if (typeof denoRuntime !== 'undefined' && typeof denoRuntime?.version?.deno === 'string') {
    return 'deno'
  }
  if (typeof process !== 'undefined' && process.versions?.node) {
    return 'node'
  }
  return 'unknown'
}

/**
 * Get environment variables from the current runtime.
 * @public
 */
export function getRuntimeEnv(): Record<string, string | undefined> {
  const kind = getRuntimeKind()
  if (kind === 'bun' && typeof Bun !== 'undefined') {
    return Bun.env
  }
  if (kind === 'deno') {
    const deno = (globalThis as unknown as { Deno?: DenoGlobal }).Deno
    if (deno?.env?.toObject) {
      return deno.env.toObject()
    }
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env
  }
  return {}
}

/**
 * Convert various data types to Uint8Array.
 * @internal
 */
export async function toUint8Array(
  data: Blob | Buffer | string | ArrayBuffer | Uint8Array
): Promise<Uint8Array> {
  if (data instanceof Uint8Array) {
    return data
  }
  if (typeof data === 'string') {
    return new TextEncoder().encode(data)
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data)
  }
  if (typeof Buffer !== 'undefined' && data instanceof Buffer) {
    return new Uint8Array(data)
  }
  if (data instanceof Blob) {
    return new Uint8Array(await data.arrayBuffer())
  }
  return new Uint8Array()
}
