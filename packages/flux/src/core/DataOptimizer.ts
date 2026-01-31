/**
 * @fileoverview Data Optimizer for workflow state persistence
 *
 * Optimizes workflow data storage by detecting large objects and converting them to references.
 * This reduces serialization overhead and I/O costs during state persistence.
 *
 * @module @gravito/flux/core
 */

/**
 * Represents a reference to external data stored in an external system.
 * The actual data can be loaded lazily when needed.
 */
export interface DataReference<T = unknown> {
  /** Marker to identify this as a reference object. */
  __ref: true
  /** Unique identifier for retrieving the data. */
  id: string
  /** The storage location of the actual data. */
  location: 's3' | 'redis' | 'database' | 'memory'
  /** Size of the original data in bytes. */
  size: number
  /** Optional lazy loader function to retrieve the actual data. */
  load?: () => Promise<T>
}

/**
 * Configuration options for DataOptimizer.
 */
export interface DataOptimizerConfig {
  /** Threshold in bytes above which data is converted to a reference. Default: 10KB */
  threshold?: number
  /** Default storage location for large objects. Default: 'database' */
  defaultLocation?: DataReference['location']
}

/**
 * Utility for optimizing workflow data storage.
 *
 * Automatically detects large objects in workflow data and converts them to references,
 * reducing serialization overhead during persistence.
 *
 * @example
 * ```typescript
 * const optimizer = new DataOptimizer({ threshold: 10 * 1024 }); // 10KB threshold
 *
 * const data = {
 *   small: 'hello',
 *   large: Buffer.alloc(100 * 1024) // 100KB buffer
 * };
 *
 * const optimized = optimizer.optimizeForStorage(data);
 * // optimized.small === 'hello'
 * // optimized.large.__ref === true (converted to reference)
 * ```
 */
export class DataOptimizer {
  private threshold: number
  private defaultLocation: DataReference['location']

  /**
   * Creates a new DataOptimizer instance.
   *
   * @param config - Configuration options for the optimizer.
   */
  constructor(config: DataOptimizerConfig = {}) {
    this.threshold = config.threshold ?? 10 * 1024 // 10KB default
    this.defaultLocation = config.defaultLocation ?? 'database'
  }

  /**
   * Estimates the size of a data object in bytes.
   *
   * This uses JSON.stringify to calculate the approximate size,
   * which may not be exact for all types but provides a reasonable estimate.
   *
   * @param data - The data to measure.
   * @returns The estimated size in bytes.
   *
   * @example
   * ```typescript
   * const size = DataOptimizer.estimateSize({ key: 'value' });
   * console.log(size); // 15 (approximate)
   * ```
   */
  static estimateSize(data: unknown): number {
    try {
      return JSON.stringify(data).length
    } catch {
      // If serialization fails, return a large number to trigger reference conversion
      return Number.MAX_SAFE_INTEGER
    }
  }

  /**
   * Optimizes a data object for storage by replacing large values with references.
   *
   * Iterates through the object's properties and converts any value exceeding the
   * threshold to a DataReference object.
   *
   * @param data - The data object to optimize.
   * @param customThreshold - Optional custom threshold for this optimization.
   * @returns A new object with large values replaced by references.
   *
   * @example
   * ```typescript
   * const optimizer = new DataOptimizer({ threshold: 1024 });
   * const result = optimizer.optimizeForStorage({
   *   small: 'text',
   *   large: Buffer.alloc(10 * 1024)
   * });
   * // result.small === 'text'
   * // result.large.__ref === true
   * ```
   */
  optimizeForStorage<T extends Record<string, any>>(
    data: T,
    customThreshold?: number
  ): Record<string, any> {
    const threshold = customThreshold ?? this.threshold
    const result: Record<string, any> = {}

    for (const [key, value] of Object.entries(data)) {
      // Skip null/undefined
      if (value === null || value === undefined) {
        result[key] = value
        continue
      }

      // Skip if already a reference
      if (this.isReference(value)) {
        result[key] = value
        continue
      }

      const size = DataOptimizer.estimateSize(value)

      if (size > threshold) {
        // Convert to reference
        result[key] = this.createReference(value, size)
      } else {
        result[key] = value
      }
    }

    return result
  }

  /**
   * Checks if a value is a DataReference.
   *
   * @param value - The value to check.
   * @returns True if the value is a DataReference.
   */
  isReference(value: unknown): value is DataReference {
    return typeof value === 'object' && value !== null && '__ref' in value && value.__ref === true
  }

  /**
   * Creates a DataReference from a value.
   *
   * @param value - The original value to create a reference for.
   * @param size - The size of the original value in bytes.
   * @returns A DataReference object.
   * @private
   */
  private createReference(value: unknown, size: number): DataReference {
    return {
      __ref: true,
      id: this.generateReferenceId(),
      location: this.defaultLocation,
      size,
      // Note: The actual storage and load implementation
      // should be handled by the storage adapter
    }
  }

  /**
   * Generates a unique identifier for a data reference.
   *
   * @returns A unique reference ID.
   * @private
   */
  private generateReferenceId(): string {
    return `ref_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  /**
   * Resolves references in a data object by loading the actual values.
   *
   * This is the inverse operation of optimizeForStorage.
   *
   * @param data - The data object containing references.
   * @returns A promise resolving to the data with references replaced by actual values.
   *
   * @example
   * ```typescript
   * const optimizer = new DataOptimizer();
   * const resolved = await optimizer.resolveReferences({
   *   small: 'text',
   *   large: { __ref: true, id: 'ref_123', location: 'database', size: 1024 }
   * });
   * // resolved.large contains the actual loaded data
   * ```
   */
  async resolveReferences<T extends Record<string, any>>(data: T): Promise<Record<string, any>> {
    const result: Record<string, any> = {}

    for (const [key, value] of Object.entries(data)) {
      if (this.isReference(value)) {
        // Load the actual data if a loader is provided
        if (value.load) {
          result[key] = await value.load()
        } else {
          // If no loader, keep the reference
          result[key] = value
        }
      } else {
        result[key] = value
      }
    }

    return result
  }

  /**
   * Calculates the total size reduction achieved by optimization.
   *
   * @param original - The original data object.
   * @param optimized - The optimized data object.
   * @returns An object containing size statistics.
   *
   * @example
   * ```typescript
   * const optimizer = new DataOptimizer();
   * const original = { large: Buffer.alloc(100 * 1024) };
   * const optimized = optimizer.optimizeForStorage(original);
   * const stats = optimizer.getOptimizationStats(original, optimized);
   * console.log(stats); // { originalSize: 102400, optimizedSize: 100, reduction: 99.9 }
   * ```
   */
  getOptimizationStats(
    original: Record<string, any>,
    optimized: Record<string, any>
  ): {
    originalSize: number
    optimizedSize: number
    reduction: number
    referencesCreated: number
  } {
    const originalSize = DataOptimizer.estimateSize(original)
    const optimizedSize = DataOptimizer.estimateSize(optimized)
    const referencesCreated = Object.values(optimized).filter((v) => this.isReference(v)).length

    return {
      originalSize,
      optimizedSize,
      reduction: ((originalSize - optimizedSize) / originalSize) * 100,
      referencesCreated,
    }
  }
}
