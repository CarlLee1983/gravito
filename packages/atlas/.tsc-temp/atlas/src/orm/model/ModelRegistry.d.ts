import type { Model } from './Model'
/**
 * Model Registry for Polymorphic Relations
 * Maps string type names (e.g., 'Post') to Model classes
 */
export declare class ModelRegistry {
  private static models
  /**
   * Register a model class
   */
  static register(model: typeof Model): void
  /**
   * Get a model class by name
   */
  static get(name: string): typeof Model | undefined
  /**
   * Clear all registered models
   */
  static clear(): void
}
