/**
 * @fileoverview Incremental state persistence using JSON Patch (RFC 6902)
 *
 * Tracks only changes between workflow states to reduce I/O overhead for large workflows.
 * Implements standard JSON Patch operations for efficient state updates.
 *
 * @module @gravito/flux/storage
 */

import * as Errors from '../errors'
import type { WorkflowState } from '../types'

/**
 * JSON Patch operation types as defined in RFC 6902.
 * @see https://datatracker.ietf.org/doc/html/rfc6902
 */
export type PatchOperation =
  | { op: 'add'; path: string; value: any }
  | { op: 'remove'; path: string }
  | { op: 'replace'; path: string; value: any }
  | { op: 'move'; from: string; path: string }
  | { op: 'copy'; from: string; path: string }
  | { op: 'test'; path: string; value: any }

/**
 * A patch containing one or more operations to transform state.
 */
export type Patch = PatchOperation[]

/**
 * Utility for computing and applying incremental state changes.
 *
 * Reduces storage overhead by serializing only the differences between workflow states
 * rather than the entire state object on every update.
 *
 * @example
 * ```typescript
 * const differ = new StateDiff();
 *
 * const prevState = { id: '1', data: { count: 0 }, version: 1 };
 * const nextState = { id: '1', data: { count: 5 }, version: 2 };
 *
 * const patch = differ.diff(prevState, nextState);
 * // [{ op: 'replace', path: '/data/count', value: 5 }, { op: 'replace', path: '/version', value: 2 }]
 *
 * const result = differ.apply(prevState, patch);
 * // result equals nextState
 * ```
 */
export class StateDiff {
  /**
   * Computes the patch operations needed to transform `prev` into `next`.
   *
   * @param prev - The previous state object.
   * @param next - The new state object.
   * @returns A JSON Patch describing the changes.
   *
   * @example
   * ```typescript
   * const differ = new StateDiff();
   * const patch = differ.diff(
   *   { status: 'pending', currentStep: 0 },
   *   { status: 'running', currentStep: 1 }
   * );
   * ```
   */
  diff(prev: WorkflowState, next: WorkflowState): Patch {
    const operations: PatchOperation[] = []

    this.diffObject(prev, next, '', operations)

    return operations
  }

  /**
   * Applies a patch to a state object, producing a new state.
   *
   * @param state - The base state to apply the patch to.
   * @param patch - The JSON Patch operations to apply.
   * @returns A new state object with the patch applied.
   *
   * @example
   * ```typescript
   * const differ = new StateDiff();
   * const patch = [{ op: 'replace', path: '/status', value: 'completed' }];
   * const updated = differ.apply(baseState, patch);
   * ```
   */
  apply(state: WorkflowState, patch: Patch): WorkflowState {
    let result = this.deepClone(state)

    for (const operation of patch) {
      result = this.applyOperation(result, operation)
    }

    return result
  }

  /**
   * Recursively compares two objects and builds patch operations.
   * @private
   */
  private diffObject(prev: any, next: any, basePath: string, operations: PatchOperation[]): void {
    if (this.deepEquals(prev, next)) return

    if (this.isPrimitive(prev) || this.isPrimitive(next)) {
      if (prev !== next) {
        operations.push({
          op: 'replace',
          path: basePath || '/',
          value: this.deepClone(next),
        })
      }
      return
    }

    if (prev instanceof Date || next instanceof Date) {
      if (!this.deepEquals(prev, next)) {
        operations.push({
          op: 'replace',
          path: basePath || '/',
          value: this.deepClone(next),
        })
      }
      return
    }

    if (Array.isArray(next)) {
      if (!Array.isArray(prev) || prev.length !== next.length) {
        operations.push({
          op: 'replace',
          path: basePath || '/',
          value: this.deepClone(next),
        })
        return
      }

      for (let i = 0; i < next.length; i++) {
        this.diffObject(prev[i], next[i], `${basePath}/${i}`, operations)
      }
      return
    }

    if (typeof next === 'object' && next !== null) {
      const prevKeys = new Set(Object.keys(prev || {}))
      const nextKeys = new Set(Object.keys(next))

      for (const key of nextKeys) {
        const path = `${basePath}/${this.escapePathSegment(key)}`
        const nextValue = next[key]

        if (nextValue === undefined) {
          if (prevKeys.has(key)) {
            operations.push({
              op: 'remove',
              path,
            })
          }
        } else if (!prevKeys.has(key)) {
          operations.push({
            op: 'add',
            path,
            value: this.deepClone(nextValue),
          })
        } else {
          this.diffObject(prev[key], nextValue, path, operations)
        }
      }

      for (const key of prevKeys) {
        if (!nextKeys.has(key)) {
          operations.push({
            op: 'remove',
            path: `${basePath}/${this.escapePathSegment(key)}`,
          })
        }
      }
    }
  }

  /**
   * Applies a single patch operation to a state object.
   * @private
   */
  private applyOperation(state: any, operation: PatchOperation): any {
    const result = this.deepClone(state)

    switch (operation.op) {
      case 'add':
      case 'replace': {
        this.setValue(result, operation.path, operation.value)
        break
      }
      case 'remove': {
        this.removeValue(result, operation.path)
        break
      }
      case 'move': {
        const value = this.getValue(result, operation.from)
        this.removeValue(result, operation.from)
        this.setValue(result, operation.path, value)
        break
      }
      case 'copy': {
        const value = this.getValue(result, operation.from)
        this.setValue(result, operation.path, value)
        break
      }
      case 'test': {
        const current = this.getValue(result, operation.path)
        if (!this.deepEquals(current, operation.value)) {
          const path = operation.path
          throw new Errors.FluxError(
            `Test operation failed at ${path}: expected ${JSON.stringify(operation.value)}, got ${JSON.stringify(current)}`,
            Errors.FluxErrorCode.INVALID_PATH_TRAVERSAL,
            { path, expected: operation.value, actual: current }
          )
        }
        break
      }
    }

    return result
  }

  /**
   * Gets a value from an object using a JSON Pointer path.
   * @private
   */
  private getValue(obj: any, path: string): any {
    if (path === '' || path === '/') return obj

    const segments = this.parsePath(path)
    let current = obj

    for (const segment of segments) {
      if (current === null || current === undefined) {
        throw Errors.invalidPathTraversal(segment, current)
      }
      current = current[segment]
    }

    return current
  }

  /**
   * Sets a value in an object using a JSON Pointer path.
   * @private
   */
  private setValue(obj: any, path: string, value: any): void {
    if (path === '' || path === '/') {
      throw Errors.cannotReplaceRoot()
    }

    const segments = this.parsePath(path)
    const lastSegment = segments.pop()!
    let current = obj

    for (const segment of segments) {
      if (!(segment in current)) {
        current[segment] = {}
      }
      current = current[segment]
    }

    current[lastSegment] = this.deepClone(value)
  }

  /**
   * Removes a value from an object using a JSON Pointer path.
   * @private
   */
  private removeValue(obj: any, path: string): void {
    if (path === '' || path === '/') {
      throw Errors.cannotRemoveRoot()
    }

    const segments = this.parsePath(path)
    const lastSegment = segments.pop()!
    let current = obj

    for (const segment of segments) {
      if (current === null || current === undefined) return
      current = current[segment]
    }

    if (Array.isArray(current)) {
      current.splice(Number(lastSegment), 1)
    } else {
      delete current[lastSegment]
    }
  }

  /**
   * Parses a JSON Pointer path into segments.
   * @private
   */
  private parsePath(path: string): string[] {
    if (path === '' || path === '/') return []
    if (!path.startsWith('/')) {
      throw Errors.invalidJsonPointer(path)
    }

    return path
      .slice(1)
      .split('/')
      .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'))
  }

  /**
   * Escapes a path segment according to JSON Pointer spec.
   * @private
   */
  private escapePathSegment(segment: string): string {
    return segment.replace(/~/g, '~0').replace(/\//g, '~1')
  }

  /**
   * Checks if a value is a primitive type.
   * @private
   */
  private isPrimitive(value: any): boolean {
    return (
      value === null ||
      value === undefined ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    )
  }

  /**
   * Creates a deep clone of an object.
   * @private
   */
  private deepClone<T>(obj: T): T {
    if (this.isPrimitive(obj)) return obj
    // TypeScript limitation: Date constructor returns Date, not T
    if (obj instanceof Date) return new Date(obj.getTime()) as T
    // TypeScript limitation: Array.map returns Array, not T
    if (Array.isArray(obj)) return obj.map((item) => this.deepClone(item)) as T
    if (typeof obj === 'object') {
      const clone: any = {}
      for (const key in obj) {
        if (Object.hasOwn(obj, key)) {
          clone[key] = this.deepClone(obj[key])
        }
      }
      return clone
    }
    return obj
  }

  /**
   * Deep equality check for values.
   * @private
   */
  private deepEquals(a: any, b: any): boolean {
    if (a === b) return true
    if (this.isPrimitive(a) || this.isPrimitive(b)) return a === b
    if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime()

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false
      return a.every((item, index) => this.deepEquals(item, b[index]))
    }

    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a)
      const keysB = Object.keys(b)
      if (keysA.length !== keysB.length) return false
      return keysA.every((key) => this.deepEquals(a[key], b[key]))
    }

    return false
  }

  /**
   * Calculates the size reduction achieved by using patches instead of full state.
   *
   * @param fullState - The complete workflow state object.
   * @param patch - The patch operations.
   * @returns Statistics about the size reduction.
   *
   * @example
   * ```typescript
   * const differ = new StateDiff();
   * const stats = differ.getPatchStats(state, patch);
   * console.log(stats); // { fullSize: 5000, patchSize: 200, reduction: 96 }
   * ```
   */
  getPatchStats(
    fullState: WorkflowState,
    patch: Patch
  ): {
    fullSize: number
    patchSize: number
    reduction: number
    operationCount: number
  } {
    const fullSize = JSON.stringify(fullState).length
    const patchSize = JSON.stringify(patch).length

    return {
      fullSize,
      patchSize,
      reduction: ((fullSize - patchSize) / fullSize) * 100,
      operationCount: patch.length,
    }
  }
}
