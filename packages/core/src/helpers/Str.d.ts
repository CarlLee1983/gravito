type StartsEndsNeedle = string | readonly string[]
export declare const Str: {
  readonly lower: (value: string) => string
  readonly upper: (value: string) => string
  readonly startsWith: (haystack: string, needles: StartsEndsNeedle) => boolean
  readonly endsWith: (haystack: string, needles: StartsEndsNeedle) => boolean
  readonly contains: (haystack: string, needles: StartsEndsNeedle) => boolean
  readonly snake: (value: string) => string
  readonly kebab: (value: string) => string
  readonly studly: (value: string) => string
  readonly camel: (value: string) => string
  readonly title: (value: string) => string
  readonly limit: (value: string, limit: number, end?: string) => string
  readonly slug: (value: string, separator?: string) => string
  readonly uuid: () => string
  readonly random: (length?: number) => string
}
//# sourceMappingURL=Str.d.ts.map
