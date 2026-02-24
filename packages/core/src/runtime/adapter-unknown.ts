/**
 * Unknown runtime adapter implementation (fallback).
 *
 * @module runtime/adapter-unknown
 * @since 3.2.0
 */

import type { RuntimeAdapter } from './types'

/**
 * Create a RuntimeAdapter for unsupported runtimes.
 * All methods throw with descriptive error messages.
 * @internal
 */
export function createUnknownAdapter(): RuntimeAdapter {
  return {
    kind: 'unknown',
    spawn() {
      throw new Error('[RuntimeAdapter] Unsupported runtime for spawn()')
    },
    async spawnAndCollect() {
      throw new Error('[RuntimeAdapter] Unsupported runtime for spawnAndCollect()')
    },
    spawnSync() {
      throw new Error('[RuntimeAdapter] Unsupported runtime for spawnSync()')
    },
    async writeFile() {
      throw new Error('[RuntimeAdapter] Unsupported runtime for writeFile()')
    },
    async readFile() {
      throw new Error('[RuntimeAdapter] Unsupported runtime for readFile()')
    },
    async readFileAsBlob() {
      throw new Error('[RuntimeAdapter] Unsupported runtime for readFileAsBlob()')
    },
    async exists() {
      throw new Error('[RuntimeAdapter] Unsupported runtime for exists()')
    },
    async stat() {
      throw new Error('[RuntimeAdapter] Unsupported runtime for stat()')
    },
    async deleteFile() {
      throw new Error('[RuntimeAdapter] Unsupported runtime for deleteFile()')
    },
    serve() {
      throw new Error('[RuntimeAdapter] Unsupported runtime for serve()')
    },
  }
}
