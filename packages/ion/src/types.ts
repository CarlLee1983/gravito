/**
 * @fileoverview Type definitions for Inertia v2 protocol features.
 *
 * This module provides type definitions for advanced Inertia features:
 * - Deferred Props: Delay loading of specific props to initial render
 * - Merge Props: Replace, prepend, or deep-merge props during partial reloads
 * - History Encryption: Control browser history handling
 * - Error Bags: Organize form validation errors by category
 *
 * @module @gravito/ion/types
 */

/**
 * Marks a prop for deferred loading.
 *
 * Deferred props are not executed during the initial page render, but are listed
 * in the `deferredProps` field of the Inertia page object. The client fetches them
 * separately after the initial render is complete.
 *
 * @template T - Type of the deferred value (inferred from factory return type).
 *
 * @example
 * ```typescript
 * inertia.render('Dashboard', {
 *   user: { id: 1, name: 'Carl' },
 *   // Heavy computation deferred to later
 *   slowStats: InertiaService.defer(() => calculateStats()),
 *   // Grouped deferred props
 *   notifications: InertiaService.defer(
 *     () => fetchNotifications(),
 *     'notifications-group'
 *   )
 * });
 * ```
 */
export interface DeferredPropDefinition<T = unknown> {
  readonly _type: 'deferred'
  readonly factory: () => T | Promise<T>
  readonly group?: string
}

/**
 * Marks a prop for merging rather than replacement.
 *
 * Used during partial reloads (X-Inertia-Partial-Data) to control how props
 * are combined with existing data on the client:
 * - `merge`: Shallow merge at top level
 * - `prepend`: Add items to the beginning of an array
 * - `deepMerge`: Recursive merge for nested objects
 *
 * @template T - Type of the prop value.
 *
 * @example
 * ```typescript
 * inertia.render('Products/List', {
 *   // Deep merge filters with existing data
 *   filters: InertiaService.deepMerge({ status: 'active', price: 100 }),
 *   // Prepend new items to the beginning of the list
 *   items: InertiaService.prepend([newProduct]),
 *   // Shallow merge config with existing data
 *   config: InertiaService.merge({ sortBy: 'name' })
 * });
 * ```
 */
export interface MergedPropDefinition<T = unknown> {
  readonly _type: 'merge' | 'prepend' | 'deepMerge'
  readonly value: T
  readonly matchOn?: string | string[]
}

/**
 * Configuration for error bags in form validation.
 *
 * Organizes form validation errors into named categories, allowing multiple
 * validation failure scenarios to coexist (e.g., 'default' and 'import-csv').
 *
 * @example
 * ```typescript
 * inertia.withErrors({
 *   email: 'Email is required',
 *   password: 'Must be at least 8 characters'
 * }, 'login');  // Bag name: 'login'
 *
 * inertia.withErrors({
 *   line_1: 'Invalid CSV at row 1',
 *   line_2: 'Invalid CSV at row 2'
 * }, 'import');  // Bag name: 'import'
 * ```
 */
export interface ErrorBagDefinition {
  readonly bag: string
  readonly errors: Record<string, string | string[]>
}

/**
 * Inertia page object structure for the initial render response.
 *
 * This is the JSON structure sent to the frontend containing component metadata
 * and all resolved props. Extended with Inertia v2 features.
 *
 * @template P - Shape of the props object.
 */
export interface InertiaPageObject<P extends Record<string, unknown> = Record<string, unknown>> {
  /** Frontend component name (e.g., 'Pages/Dashboard') */
  component: string
  /** Resolved and merged props for the component */
  props: P
  /** Current URL without query string */
  url: string
  /** Asset version (cache-busting identifier) */
  version?: string
  /** Deferred prop groups and their factories (Inertia v2) */
  deferredProps?: Record<string, string[]>
  /** Keys marked for merge/prepend/deepMerge (Inertia v2) */
  mergeProps?: {
    keys: string[]
    mode: 'merge' | 'prepend' | 'deepMerge'
  }[]
  /** Whether to encrypt browser history (Inertia v2) */
  encryptHistory?: boolean
  /** Whether to clear browser history (Inertia v2) */
  clearHistory?: boolean
  /** Error bags organized by category (Inertia v2) */
  errorBags?: Record<string, Record<string, string | string[]>>
}

/**
 * Inertia response metadata for partial reloads.
 *
 * Controls how the frontend should process the props update:
 * - Handles reset scenarios (X-Inertia-Reset header)
 * - Tracks which keys should be reset to undefined
 */
export interface PartialReloadMetadata {
  /** Keys to reset to undefined before merging new props */
  resetKeys?: string[]
  /** Merge strategy for the reload response */
  mergeStrategy?: 'replace' | 'merge' | 'deepMerge'
}
