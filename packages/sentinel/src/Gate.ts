import { AuthorizationException } from '@gravito/core'
import type { Authenticatable } from './contracts/Authenticatable'

/**
 * Constructor type for classes (e.g., Models, Policies).
 * @public
 */
export type Constructor<T = unknown> = new (...args: unknown[]) => T

/**
 * Authorization policy callback function.
 * @public
 */
export type PolicyCallback = (
  user: Authenticatable | null,
  ...args: unknown[]
) => boolean | Promise<boolean>

/**
 * Authorization Gate for permission management.
 * @public
 * @since 1.0.0
 */
export class Gate {
  protected abilities = new Map<string, PolicyCallback>()
  protected policies = new Map<Constructor, Record<string, unknown>>()
  protected beforeCallbacks: PolicyCallback[] = []
  protected afterCallbacks: PolicyCallback[] = []

  protected userResolver?: () => Promise<Authenticatable | null>

  constructor(protected parent?: Gate) {
    if (parent) {
      this.abilities = parent.abilities
      this.policies = parent.policies
      this.beforeCallbacks = parent.beforeCallbacks
      this.afterCallbacks = parent.afterCallbacks
    }
  }

  /**
   * Create a new Gate instance for a specific user.
   * @param resolver - Async function to resolve the user
   */
  public forUser(resolver: () => Promise<Authenticatable | null>): Gate {
    const gate = new Gate(this)
    gate.userResolver = resolver
    return gate
  }

  /**
   * Define a new authorization ability.
   * @param ability - Unique name for the ability
   * @param callback - Logic to determine access
   */
  define(ability: string, callback: PolicyCallback): this {
    this.abilities.set(ability, callback)
    return this
  }

  /**
   * Define a policy class for a model.
   * @param model - Model constructor
   * @param policy - Object containing ability methods
   */
  policy(model: Constructor, policy: Record<string, unknown>): this {
    this.policies.set(model, policy)
    return this
  }

  /**
   * Register a callback to run before any other check.
   */
  before(callback: PolicyCallback): this {
    this.beforeCallbacks.push(callback)
    return this
  }

  /**
   * Register a callback to run after all other checks.
   */
  after(callback: PolicyCallback): this {
    this.afterCallbacks.push(callback)
    return this
  }

  /**
   * Check if the user has a specific ability.
   */
  async allows(ability: string, ...args: unknown[]): Promise<boolean> {
    const user = this.userResolver ? await this.userResolver() : null

    // 1. Run before callbacks
    for (const callback of this.beforeCallbacks) {
      const result = await callback(user, ability, ...args)
      if (result !== undefined && result !== null) {
        return !!result
      }
    }

    // 2. Check defined abilities
    if (this.abilities.has(ability)) {
      const result = await this.abilities.get(ability)?.(user, ...args)
      return this.runAfterCallbacks(user, ability, !!result, ...args)
    }

    // 3. Check policies
    const target = args[0]
    if (target) {
      const policy = this.getPolicyFor(target)
      const handler = policy ? policy[ability] : undefined
      if (typeof handler === 'function') {
        const result = await handler(user, ...args)
        if (result !== undefined && result !== null) {
          return this.runAfterCallbacks(user, ability, !!result, ...args)
        }
      }
    }

    return this.runAfterCallbacks(user, ability, false, ...args)
  }

  async denies(ability: string, ...args: unknown[]): Promise<boolean> {
    return !(await this.allows(ability, ...args))
  }

  async authorize(ability: string, ...args: unknown[]): Promise<void> {
    if (await this.denies(ability, ...args)) {
      throw new AuthorizationException()
    }
  }

  protected async runAfterCallbacks(
    user: Authenticatable | null,
    ability: string,
    result: boolean,
    ...args: unknown[]
  ): Promise<boolean> {
    for (const callback of this.afterCallbacks) {
      const afterResult = await callback(user, ability, result, ...args)
      if (afterResult !== undefined && afterResult !== null) {
        return !!afterResult
      }
    }

    return result
  }

  protected getPolicyFor(target: unknown): Record<string, unknown> | null {
    if (this.policies.has(target as Constructor)) {
      return this.policies.get(target as Constructor) ?? null
    }

    if (
      target &&
      typeof target === 'object' &&
      'constructor' in target &&
      this.policies.has((target as { constructor: Constructor }).constructor)
    ) {
      return this.policies.get((target as { constructor: Constructor }).constructor) ?? null
    }

    return null
  }
}
