export type PathSegment = string | number
export type DataPath = string | readonly PathSegment[]
export declare function dataGet<TDefault = undefined>(
  target: unknown,
  path: DataPath | null | undefined,
  defaultValue?: TDefault
): unknown | TDefault
export declare function dataHas(target: unknown, path: DataPath | null | undefined): boolean
export declare function dataSet(
  target: unknown,
  path: DataPath,
  setValue: unknown,
  overwrite?: boolean
): unknown
//# sourceMappingURL=data.d.ts.map
