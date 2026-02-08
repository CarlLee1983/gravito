/**
 * Contract for a mechanism that predicts future cache key accesses.
 *
 * Implementations observe sequential access patterns to predict which keys
 * are likely to be requested next, enabling prefetching strategies.
 *
 * @public
 * @since 3.2.0
 */
export interface AccessPredictor {
  /**
   * Record a cache key access to learn temporal patterns.
   *
   * @param key - Cache key currently being accessed.
   */
  record(key: string): void

  /**
   * Predict potential future keys based on learned access history.
   *
   * @param key - Current cache key acting as the trigger for prediction.
   * @returns Array of predicted keys, ordered by likelihood.
   */
  predict(key: string): string[]

  /**
   * Reset all learned transition probabilities and state.
   */
  reset(): void
}

/**
 * A simple Markov Chain predictor (Order-1).
 *
 * Records transitions (A -> B) between sequential accesses and predicts
 * B when A is next encountered. This is particularly effective for
 * predictable resource loading sequences.
 *
 * @public
 * @since 3.2.0
 *
 * @example
 * ```typescript
 * const predictor = new MarkovPredictor();
 * predictor.record('user:1');
 * predictor.record('user:1:profile');
 * const next = predictor.predict('user:1'); // ['user:1:profile']
 * ```
 */
export class MarkovPredictor implements AccessPredictor {
  private transitions = new Map<string, Map<string, number>>()
  private lastKey: string | null = null
  private readonly maxNodes: number
  private readonly maxEdgesPerNode: number

  /**
   * Initialize a new MarkovPredictor.
   *
   * @param options - Limits for internal transition graph to manage memory.
   */
  constructor(options: { maxNodes?: number; maxEdgesPerNode?: number } = {}) {
    this.maxNodes = options.maxNodes ?? 1000
    this.maxEdgesPerNode = options.maxEdgesPerNode ?? 10
  }

  record(key: string): void {
    if (this.lastKey && this.lastKey !== key) {
      if (!this.transitions.has(this.lastKey)) {
        if (this.transitions.size >= this.maxNodes) {
          // Simple eviction: clear everything if full.
          // In a real localized scenario we might use LRU, but for cache prediction this is often enough
          // or we could remove a random key.
          this.transitions.clear()
        }
        this.transitions.set(this.lastKey, new Map())
      }

      const edges = this.transitions.get(this.lastKey)!
      const count = edges.get(key) ?? 0
      edges.set(key, count + 1)

      // Prune edges if too many
      if (edges.size > this.maxEdgesPerNode) {
        // Remove least frequent
        let minKey = ''
        let minCount = Infinity
        for (const [k, c] of edges) {
          if (c < minCount) {
            minCount = c
            minKey = k
          }
        }
        if (minKey) {
          edges.delete(minKey)
        }
      }
    }

    this.lastKey = key
  }

  predict(key: string): string[] {
    const edges = this.transitions.get(key)
    if (!edges) {
      return []
    }

    // Return keys sorted by frequency (descending)
    return Array.from(edges.entries())
      .sort((a, b) => b[1] - a[1])
      .map((entry) => entry[0])
  }

  reset(): void {
    this.transitions.clear()
    this.lastKey = null
  }
}
