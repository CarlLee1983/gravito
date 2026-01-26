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
export function applyMixins<
  T extends new (
    ...args: unknown[]
  ) => unknown,
  U extends (new (
    ...args: unknown[]
  ) => unknown)[],
>(base: T, mixins: U): T & U[number] {
  mixins.forEach((mixin) => {
    Object.getOwnPropertyNames(mixin.prototype).forEach((name) => {
      const descriptor = Object.getOwnPropertyDescriptor(mixin.prototype, name)
      if (descriptor && !Object.hasOwn(base.prototype, name)) {
        Object.defineProperty(base.prototype, name, descriptor)
      }
    })
  })
  // TypeScript cannot statically verify the intersection type at compile time
  // This is a limitation of mixin patterns - runtime behavior is correct
  return base as T & U[number]
}
