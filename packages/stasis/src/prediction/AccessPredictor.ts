export interface AccessPredictor {
  /**
   * Record an access to a key.
   * @param key The key being accessed
   */
  record(key: string): void

  /**
   * Predict likely next keys based on access history.
   * @param key The current key
   * @returns Array of predicted keys
   */
  predict(key: string): string[]

  /**
   * Reset prediction statistics.
   */
  reset(): void
}

/**
 * A simple Markov Chain predictor (Order-1).
 * Records transitions A -> B and predicts B when A is seen.
 */
export class MarkovPredictor implements AccessPredictor {
  private transitions = new Map<string, Map<string, number>>()
  private lastKey: string | null = null
  private readonly maxNodes: number
  private readonly maxEdgesPerNode: number

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
        if (minKey) edges.delete(minKey)
      }
    }

    this.lastKey = key
  }

  predict(key: string): string[] {
    const edges = this.transitions.get(key)
    if (!edges) return []

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
