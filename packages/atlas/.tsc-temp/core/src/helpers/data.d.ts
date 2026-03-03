/**
 * Path segment (key) in a data structure.
 * @public
 */
export type PathSegment = string | number
/**
 * Path to a value (dot notation or array of segments).
 * @public
 */
export type DataPath = string | readonly PathSegment[]
/**
 * Retrieve a value from a deep object using dot notation.
 * @public
 */
export declare function dataGet<TDefault = undefined>(
  target: unknown,
  path: DataPath | null | undefined,
  defaultValue?: TDefault
): unknown | TDefault
/**
 * Check if a key exists in a deep object using dot notation.
 * @public
 */
export declare function dataHas(target: unknown, path: DataPath | null | undefined): boolean
/**
 * Set a value in a deep object using dot notation.
 * @public
 */
export declare function dataSet(
  target: unknown,
  path: DataPath,
  setValue: unknown,
  overwrite?: boolean
): unknown
