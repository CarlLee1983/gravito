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
 * Callback function to guess policy class name/type from a model class.
 * @public
 */
export type PolicyGuesser = (model: Constructor) => unknown

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
  protected policyGuessers: PolicyGuesser[] = []

  protected userResolver?: () => Promise<Authenticatable | null>

  constructor(protected parent?: Gate) {
    if (parent) {
      this.abilities = parent.abilities
      this.policies = parent.policies
      this.beforeCallbacks = parent.beforeCallbacks
      this.afterCallbacks = parent.afterCallbacks
      this.policyGuessers = parent.policyGuessers
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
   * Register a callback to guess the policy for a given model.
   *
   * @param guesser - The guessing logic
   */
  guessPolicyUsing(guesser: PolicyGuesser): this {
    this.policyGuessers.push(guesser)
    return this
  }

  /**
   * Discover and register policies from a list of classes.
   *
   * This method inspects each provided class for a static `model` property.
   * If found, it registers the class as a policy for that model.
   *
   * @param policies - List of policy classes or modules
   * @example
   * ```typescript
   * import * as policies from './policies';
   * gate.discover(Object.values(policies));
   * ```
   */
  discover(policies: unknown[] | Record<string, unknown>): this {
    const list = Array.isArray(policies) ? policies : Object.values(policies)

    for (const policyClass of list) {
      if (typeof policyClass === 'function' && 'model' in policyClass) {
        const model = (policyClass as any).model
        if (model) {
          this.policy(model as Constructor, new (policyClass as any)())
        }
      }
    }

    return this
  }

  /**
   * Determine if the user has a specific ability.
   *
   * This method executes the following steps:
   * 1. Run "before" callbacks. If any returns a boolean, that result is final.
   * 2. Check if a specific ability callback is defined.
   * 3. Check if a policy is defined for the first argument (target object).
   * 4. Run "after" callbacks on the intermediate result.
   *
   * @param ability - The name of the ability to check
   * @param args - Additional arguments for the check (usually the resource)
   * @returns True if allowed, false otherwise
   */
  async allows(ability: string, ...args: unknown[]): Promise<boolean> {
    const user = this.userResolver ? await this.userResolver() : null

    for (const callback of this.beforeCallbacks) {
      const result = await callback(user, ability, ...args)
      if (result !== undefined && result !== null) {
        return !!result
      }
    }

    if (this.abilities.has(ability)) {
      const result = await this.abilities.get(ability)?.(user, ...args)
      return this.runAfterCallbacks(user, ability, !!result, ...args)
    }

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

  /**
   * Determine if the user does NOT have a specific ability.
   *
   * @param ability - Ability name
   * @param args - Arguments for the check
   * @returns True if denied
   */
  async denies(ability: string, ...args: unknown[]): Promise<boolean> {
    return !(await this.allows(ability, ...args))
  }

  /**
   * Authorize a specific ability or throw an exception.
   *
   * @param ability - Ability name
   * @param args - Arguments for the check
   * @throws {AuthorizationException} If the user is not authorized
   */
  async authorize(ability: string, ...args: unknown[]): Promise<void> {
    if (await this.denies(ability, ...args)) {
      throw new AuthorizationException()
    }
  }

  /**
   * Execute after callbacks on the result.
   */
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

  /**
   * Get the policy instance for a given target.
   */
  protected getPolicyFor(target: unknown): Record<string, unknown> | null {
    let modelConstructor: Constructor | null = null

    if (typeof target === 'function') {
      modelConstructor = target as Constructor
    } else if (target && typeof target === 'object' && 'constructor' in target) {
      modelConstructor = (target as { constructor: Constructor }).constructor
    }

    if (!modelConstructor) {
      return null
    }

    if (this.policies.has(modelConstructor)) {
      return this.policies.get(modelConstructor) ?? null
    }

    // Try to guess the policy
    for (const guesser of this.policyGuessers) {
      const policy = guesser(modelConstructor)
      if (policy) {
        const instance =
          typeof policy === 'function' ? new (policy as any)() : (policy as Record<string, unknown>)
        this.policy(modelConstructor, instance)
        return instance
      }
    }

    return null
  }
}
