/**
 * Runtime detection utilities.
 *
 * @module runtime/detection
 * @since 3.2.0
 */
import type { RuntimeKind } from './types'
/**
 * Detect the current JavaScript runtime environment.
 * @internal
 */
export declare function getRuntimeKind(): RuntimeKind
/**
 * Get environment variables from the current runtime.
 * @public
 */
export declare function getRuntimeEnv(): Record<string, string | undefined>
/**
 * Convert various data types to Uint8Array.
 * @internal
 */
export declare function toUint8Array(
  data: Blob | Buffer | string | ArrayBuffer | Uint8Array
): Promise<Uint8Array>
