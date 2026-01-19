import type { Model } from './Model'

/**
 * Model Registry for Polymorphic Relations
 * Maps string type names (e.g., 'Post') to Model classes
 */
export class ModelRegistry {
  private static models = new Map<string, typeof Model>()

  /**
   * Register a model class
   */
  static register(model: typeof Model): void {
    if (!model.name) {
      return
    }

    // Register by class name
    this.models.set(model.name, model)

    // Handle "bound Post" or similar proxy name artifacts if they exist
    const cleanName = model.name.replace('bound ', '')
    if (cleanName !== model.name) {
      this.models.set(cleanName, model)
    }

    // If it has a custom table name, register that too as a fallback
    const modelWithTable = model as typeof Model & { table?: string }
    if (modelWithTable.table) {
      this.models.set(modelWithTable.table, model)
    }
  }

  /**
   * Get a model class by name
   */
  static get(name: string): typeof Model | undefined {
    return this.models.get(name)
  }

  /**
   * Clear all registered models
   */
  static clear(): void {
    this.models.clear()
  }
}
