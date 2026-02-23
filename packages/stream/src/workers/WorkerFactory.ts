/**
 * Worker Factory Implementation.
 *
 * Provides runtime-aware worker creation with automatic environment detection.
 * Abstracts differences between Bun Workers and Node.js Worker Threads,
 * allowing transparent switching based on the runtime environment.
 *
 * @public
 */

import { BunWorker, type BunWorkerConfig } from './BunWorker'
import { SandboxedWorker, type SandboxedWorkerConfig } from './SandboxedWorker'

/**
 * Union type for worker configuration.
 * Accepts both Bun and Node.js specific configs.
 */
export type WorkerConfig = BunWorkerConfig | SandboxedWorkerConfig

/**
 * Union type for worker instances.
 */
export type Worker = BunWorker | SandboxedWorker

/**
 * Runtime environment type.
 */
export type RuntimeEnvironment = 'bun' | 'node' | 'auto'

/**
 * Worker Factory Interface.
 *
 * Defines the contract for creating workers in different runtime environments.
 */
export interface IWorkerFactory {
  /**
   * Create a worker appropriate for the current runtime.
   *
   * @param config - Configuration for the worker.
   * @returns A worker instance (BunWorker or SandboxedWorker).
   */
  create(config: WorkerConfig): BunWorker | SandboxedWorker

  /**
   * Get the detected runtime environment.
   *
   * @returns The runtime environment ('bun' or 'node').
   */
  getRuntime(): 'bun' | 'node'

  /**
   * Check if running in Bun environment.
   *
   * @returns `true` if running on Bun, `false` otherwise.
   */
  isBun(): boolean

  /**
   * Check if running in Node.js environment.
   *
   * @returns `true` if running on Node.js, `false` otherwise.
   */
  isNode(): boolean
}

/**
 * Runtime-aware Worker Factory.
 *
 * Automatically detects the runtime environment (Bun or Node.js) and creates
 * the appropriate worker type. Provides a unified interface that abstracts
 * away runtime-specific details.
 *
 * @example
 * ```typescript
 * // Automatic detection
 * const factory = new RuntimeAwareWorkerFactory()
 * const worker = factory.create({ maxExecutionTime: 30000 })
 *
 * // Force specific runtime (testing/development)
 * const bunFactory = new RuntimeAwareWorkerFactory('bun')
 * const nodeFactory = new RuntimeAwareWorkerFactory('node')
 * ```
 */
export class RuntimeAwareWorkerFactory implements IWorkerFactory {
  private runtime: 'bun' | 'node'

  /**
   * Creates a RuntimeAwareWorkerFactory instance.
   *
   * @param runtimeOverride - Optional override for runtime detection.
   *   - `'auto'` or undefined: Automatically detect (default)
   *   - `'bun'`: Force Bun runtime
   *   - `'node'`: Force Node.js runtime
   */
  constructor(runtimeOverride?: RuntimeEnvironment) {
    if (runtimeOverride === 'bun') {
      this.runtime = 'bun'
    } else if (runtimeOverride === 'node') {
      this.runtime = 'node'
    } else {
      // Auto-detect
      this.runtime = this.detectRuntime()
    }
  }

  /**
   * Automatically detects the runtime environment.
   *
   * Detection strategy:
   * 1. Check for Bun global object
   * 2. Fall back to Node.js
   *
   * @returns The detected runtime ('bun' or 'node').
   */
  private detectRuntime(): 'bun' | 'node' {
    // Check for Bun global
    if (typeof Bun !== 'undefined' && Bun.isMainThread) {
      return 'bun'
    }

    // Fall back to Node.js
    return 'node'
  }

  /**
   * Creates a worker appropriate for the current runtime.
   *
   * @param config - Configuration for the worker.
   * @returns A BunWorker if running on Bun, SandboxedWorker otherwise.
   */
  create(config: WorkerConfig): BunWorker | SandboxedWorker {
    if (this.runtime === 'bun') {
      return new BunWorker(config as BunWorkerConfig)
    }

    return new SandboxedWorker(config as SandboxedWorkerConfig)
  }

  /**
   * Gets the detected runtime environment.
   *
   * @returns The runtime ('bun' or 'node').
   */
  getRuntime(): 'bun' | 'node' {
    return this.runtime
  }

  /**
   * Checks if running in Bun environment.
   *
   * @returns `true` if running on Bun, `false` otherwise.
   */
  isBun(): boolean {
    return this.runtime === 'bun'
  }

  /**
   * Checks if running in Node.js environment.
   *
   * @returns `true` if running on Node.js, `false` otherwise.
   */
  isNode(): boolean {
    return this.runtime === 'node'
  }
}

/**
 * Helper function to create a default factory with optional runtime override.
 *
 * @param runtimeOverride - Optional runtime override.
 * @returns A new RuntimeAwareWorkerFactory instance.
 */
export function createWorkerFactory(
  runtimeOverride?: RuntimeEnvironment
): RuntimeAwareWorkerFactory {
  return new RuntimeAwareWorkerFactory(runtimeOverride)
}
