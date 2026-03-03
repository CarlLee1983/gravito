/**
 * Apply mixins to a class.
 *
 * @param derivedCtor - The class to receive the mixins.
 * @param constructors - The source classes to copy properties from.
 *
 * @public
 * @since 3.0.0
 */
export declare function applyMixins(
  derivedCtor: new (...args: unknown[]) => unknown,
  constructors: (new (...args: unknown[]) => unknown)[]
): void
