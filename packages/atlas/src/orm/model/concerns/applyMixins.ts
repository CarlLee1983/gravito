/**
 * Mixin utility for composing classes with multiple concerns.
 *
 * @param base - Base class to extend
 * @param mixins - Mixin classes to apply
 * @returns Combined class with all mixin properties
 */
export function applyMixins<T extends new (...args: any[]) => any, U extends any[]>(
  base: T,
  mixins: U
): T & U {
  mixins.forEach((mixin) => {
    Object.getOwnPropertyNames(mixin.prototype).forEach((name) => {
      const descriptor = Object.getOwnPropertyDescriptor(mixin.prototype, name)
      if (descriptor && !Object.hasOwn(base.prototype, name)) {
        Object.defineProperty(base.prototype, name, descriptor)
      }
    })
  })
  return base as any
}
