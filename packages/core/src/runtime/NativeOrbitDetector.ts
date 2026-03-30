/**
 * Native Orbit Detector — Bun capability introspection utility.
 *
 * Allows any Orbit to probe Bun-native APIs without importing Bun directly.
 * All Bun access is performed via globalThis type narrowing.
 *
 * @module runtime/NativeOrbitDetector
 * @since 3.3.0
 */

import { getRuntimeKind } from './detection'

// ============ Local Bun type interface (no bare Bun import) ============

/**
 * Minimal Bun global shape used for capability probing.
 * @internal
 */
interface BunGlobal {
  version?: string
  password?: {
    hash?: (...args: unknown[]) => unknown
    verify?: (...args: unknown[]) => unknown
  }
  CryptoHasher?: new (algo: string) => {
    update: (input: string | Uint8Array) => { digest: (enc: string) => string }
  }
  Glob?: new (pattern: string) => { scan?: (dir: string) => AsyncIterable<string> }
}

// ============ NativeFeatures type ============

/**
 * A frozen snapshot of Bun-native capability flags detected at runtime.
 */
export interface NativeFeatures {
  readonly runtime: 'bun' | 'node' | 'deno' | 'unknown'
  readonly bunVersion: string | null
  readonly password: {
    readonly available: boolean
    readonly argon2id: boolean
    readonly bcrypt: boolean
  }
  readonly cryptoHasher: {
    readonly available: boolean
    readonly sha256: boolean
    readonly sha512: boolean
    readonly blake2b: boolean
  }
  readonly glob: boolean
}

// ============ Helpers ============

/**
 * Probe whether a CryptoHasher constructor supports a given algorithm.
 * @internal
 */
function probeCryptoHasher(
  CryptoHasherCtor: unknown,
  algo: string,
): boolean {
  try {
    const ctor = CryptoHasherCtor as new (algo: string) => {
      update: (input: string) => { digest: (enc: string) => string }
    }
    new ctor(algo).update('').digest('hex')
    return true
  } catch {
    return false
  }
}

// ============ NativeOrbitDetector class ============

/**
 * Utility that detects and caches Bun-native capabilities.
 *
 * Usage:
 * ```typescript
 * const features = NativeOrbitDetector.detectBunCapabilities()
 * if (features.cryptoHasher.sha512) { ... }
 * ```
 */
export class NativeOrbitDetector {
  /** @internal */
  private static cached: NativeFeatures | null = null

  /**
   * Detect Bun capabilities and return a frozen, cached NativeFeatures object.
   * On non-Bun runtimes, all native fields are false and runtime is set accordingly.
   */
  static detectBunCapabilities(): NativeFeatures {
    if (this.cached !== null) {
      return this.cached
    }

    const kind = getRuntimeKind()
    const B = (globalThis as unknown as { Bun?: BunGlobal }).Bun

    if (kind !== 'bun' || !B) {
      this.cached = Object.freeze({
        runtime: kind,
        bunVersion: null,
        password: Object.freeze({ available: false, argon2id: false, bcrypt: false }),
        cryptoHasher: Object.freeze({
          available: false,
          sha256: false,
          sha512: false,
          blake2b: false,
        }),
        glob: false,
      }) as NativeFeatures
      return this.cached
    }

    // ---- password probing ----
    const hasPassword =
      typeof B.password?.hash === 'function' && typeof B.password?.verify === 'function'
    // argon2id and bcrypt are always supported when Bun.password is available
    const passwordFeatures = Object.freeze({
      available: hasPassword,
      argon2id: hasPassword,
      bcrypt: hasPassword,
    })

    // ---- CryptoHasher probing ----
    const HasherCtor = B.CryptoHasher
    const hasHasher = typeof HasherCtor === 'function'
    const sha256 = hasHasher ? probeCryptoHasher(HasherCtor, 'sha256') : false
    const sha512 = hasHasher ? probeCryptoHasher(HasherCtor, 'sha512') : false
    const blake2b = hasHasher ? probeCryptoHasher(HasherCtor, 'blake2b256') : false
    const cryptoHasherFeatures = Object.freeze({
      available: hasHasher && sha256,
      sha256,
      sha512,
      blake2b,
    })

    // ---- Glob probing ----
    const hasGlob = typeof B.Glob === 'function'

    this.cached = Object.freeze({
      runtime: kind,
      bunVersion: B.version ?? null,
      password: passwordFeatures,
      cryptoHasher: cryptoHasherFeatures,
      glob: hasGlob,
    }) as NativeFeatures

    return this.cached
  }

  /**
   * Reset the capability cache. Used in tests.
   */
  static reset(): void {
    this.cached = null
  }
}

// ============ formatCapabilityReport ============

/**
 * Format a human-readable capability report for logging.
 *
 * @example
 * ```
 * [gravito] native: Bun.password argon2id ✓, Bun.CryptoHasher ✓, Bun.Glob ✓
 * ```
 */
export function formatCapabilityReport(f: NativeFeatures): string {
  const passwordPart = f.password.argon2id
    ? 'Bun.password argon2id ✓'
    : 'Bun.password argon2id ✗ (fallback: none)'

  const hasherPart = f.cryptoHasher.available
    ? 'Bun.CryptoHasher ✓'
    : 'Bun.CryptoHasher ✗ (fallback: node:crypto)'

  const globPart = f.glob
    ? 'Bun.Glob ✓'
    : 'Bun.Glob ✗ (fallback: node:fs glob)'

  return `[gravito] native: ${passwordPart}, ${hasherPart}, ${globPart}`
}
