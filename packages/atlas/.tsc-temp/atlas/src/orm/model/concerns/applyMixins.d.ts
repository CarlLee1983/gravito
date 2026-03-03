/**
 * Mixin utility for composing classes with multiple concerns.
 * @description Utility function to copy properties from mixin prototypes to a base class prototype.
 *
 * @param base - Base class to extend
 * @param mixins - Mixin classes to apply
 * @returns Combined class with all mixin properties
 *
 * @example
 * ```typescript
 * class MyModel extends Model {}
 * applyMixins(MyModel, [HasAttributes, HasEvents])
 * ```
 */
export declare function applyMixins<
  T extends new (
    ...args: unknown[]
  ) => unknown,
  U extends (new (
    ...args: unknown[]
  ) => unknown)[],
>(base: T, mixins: U): T & U[number]
