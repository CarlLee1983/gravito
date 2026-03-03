/**
 * Calculate Levenshtein distance between two strings
 * Used for "Did you mean?" suggestions
 */
export declare function levenshtein(a: string, b: string): number
/**
 * Find similar strings from a list
 */
export declare function findSimilar(
  target: string,
  candidates: string[],
  maxDistance?: number,
  maxResults?: number
): string[]
