/**
 * Apply mixins to a class.
 *
 * @param derivedCtor - The class to receive the mixins.
 * @param constructors - The source classes to copy properties from.
 *
 * @public
 * @since 3.0.0
 */
export function applyMixins(derivedCtor: any, constructors: any[]) {
  constructors.forEach((baseCtor) => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
      if (name === 'constructor') return
      Object.defineProperty(
        derivedCtor.prototype,
        name,
        Object.getOwnPropertyDescriptor(baseCtor.prototype, name) || Object.create(null)
      )
    })

    Object.getOwnPropertyNames(baseCtor).forEach((name) => {
      if (['length', 'prototype', 'name', 'constructor'].includes(name)) return
      Object.defineProperty(
        derivedCtor,
        name,
        Object.getOwnPropertyDescriptor(baseCtor, name) || Object.create(null)
      )
    })
  })
}
