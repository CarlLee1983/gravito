import { createHash } from 'node:crypto'
import type { RedisClientContract } from './types'

/**
 * Represents a registered Lua script definition.
 */
export interface ScriptDefinition {
  /**
   * The Lua source code of the script.
   */
  lua: string
  /**
   * The SHA1 hash of the Lua source code, used for EVALSHA.
   */
  sha1: string
  /**
   * The number of keys the script expects.
   * If not provided, it defaults to the length of the keys array at runtime.
   */
  numberOfKeys?: number
}

/**
 * Lua Script Registry
 *
 * The `ScriptRegistry` manages Lua scripts for Redis with performance optimizations.
 * It automatically calculates SHA1 hashes for scripts to enable `EVALSHA` execution,
 * which reduces network bandwidth by sending the hash instead of the full script.
 *
 * Features:
 * - **Automatic SHA1**: Calculates the hash upon registration.
 * - **EVALSHA Optimization**: Attempts to execute scripts using their SHA1 hash.
 * - **Transparent Fallback**: If the script is not yet cached on the Redis server
 *   (returning a `NOSCRIPT` error), it automatically falls back to `EVAL` and
 *   sends the full Lua source.
 *
 * @example
 * ```typescript
 * const registry = new ScriptRegistry(redisClient);
 *
 * registry.register('get_and_del', `
 *   local val = redis.call('GET', KEYS[1])
 *   if val then redis.call('DEL', KEYS[1]) end
 *   return val
 * `);
 *
 * const result = await registry.execute('get_and_del', ['my-key']);
 * ```
 */
export class ScriptRegistry {
  /**
   * Creates an instance of ScriptRegistry.
   *
   * @param client - The Redis client contract used for execution.
   * @param scripts - Optional initial map of script definitions.
   */
  constructor(
    private client: RedisClientContract,
    private scripts: Map<string, ScriptDefinition> = new Map()
  ) {}

  /**
   * Registers a new Lua script in the registry.
   *
   * This method automatically calculates the SHA1 hash of the provided Lua code,
   * which is required for `EVALSHA` optimization.
   *
   * @param name - A unique identifier for the script.
   * @param lua - The Lua source code to be executed.
   * @param numberOfKeys - Optional fixed number of keys. If omitted, the number of keys
   *                       will be determined by the length of the `keys` array during execution.
   *
   * @example
   * ```typescript
   * registry.register('increment_by_two', 'return redis.call("INCRBY", KEYS[1], 2)', 1);
   * ```
   */
  register(name: string, lua: string, numberOfKeys?: number): void {
    const sha1 = createHash('sha1').update(lua).digest('hex')
    this.scripts.set(name, { lua, sha1, numberOfKeys })
  }

  /**
   * Executes a registered Lua script by its name.
   *
   * The execution flow is optimized for performance:
   * 1. It first attempts to execute the script using `EVALSHA` with the pre-calculated hash.
   * 2. If the Redis server returns a `NOSCRIPT` error (meaning the script is not in the cache),
   *    it catches the error and automatically retries using `EVAL` with the full Lua source.
   * 3. Subsequent calls will likely succeed with `EVALSHA` as `EVAL` caches the script.
   *
   * @param name - The name of the registered script to execute.
   * @param keys - An array of keys to be passed to the script (accessible via `KEYS` in Lua).
   * @param args - An array of arguments to be passed to the script (accessible via `ARGV` in Lua).
   * @returns A promise that resolves with the result of the script execution.
   * @throws Error if the script name is not registered or if Redis execution fails (other than NOSCRIPT).
   *
   * @example
   * ```typescript
   * // Basic execution
   * const val = await registry.execute('my_script', ['key1'], ['arg1']);
   *
   * // Execution with multiple keys and args
   * await registry.execute('complex_op', ['k1', 'k2'], ['a1', 'a2', 'a3']);
   * ```
   */
  async execute(name: string, keys: string[] = [], args: string[] = []): Promise<unknown> {
    const script = this.scripts.get(name)
    if (!script) {
      throw new Error(`Script "${name}" not registered`)
    }

    const numKeys = script.numberOfKeys ?? keys.length

    try {
      return await this.client.evalsha(script.sha1, numKeys, ...keys, ...args)
    } catch (error: any) {
      // Check for NOSCRIPT error from both Bun.redis and ioredis
      // Redis error message: "NOSCRIPT No matching script. Please use EVAL."
      const msg = error.message || String(error)
      if (msg.includes('NOSCRIPT')) {
        return await this.client.eval(script.lua, numKeys, ...keys, ...args)
      }
      throw error
    }
  }

  /**
   * Retrieves the definition of a registered script.
   *
   * @param name - The name of the script to retrieve.
   * @returns The script definition if found, otherwise `undefined`.
   */
  get(name: string): ScriptDefinition | undefined {
    return this.scripts.get(name)
  }
}
