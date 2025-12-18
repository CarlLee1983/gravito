/**
 * Resource Transformer - explicit data transformation.
 *
 * Similar to Laravel API Resources: transformation happens in an explicit, discoverable place.
 */
export abstract class ResourceTransformer<TModel = any, TResource = any> {
  /**
   * Transform a single model into a resource.
   */
  abstract transform(model: TModel): TResource

  /**
   * Transform multiple models into a resource array.
   */
  transformMany(models: TModel[]): TResource[] {
    return models.map((model) => this.transform(model))
  }

  /**
   * Transform a model collection into a resource array.
   */
  transformCollection(models: TModel[] | { toArray(): TModel[] }): TResource[] {
    const array = Array.isArray(models) ? models : models.toArray()
    return this.transformMany(array)
  }

  /**
   * Include relation data (optional).
   */
  with?(relation: string): this {
    return this
  }

  /**
   * Exclude fields (optional).
   */
  except?(fields: string[]): this {
    return this
  }

  /**
   * Only include specific fields (optional).
   */
  only?(fields: string[]): this {
    return this
  }
}

/**
 * Resource Transformer factory.
 */
export function createTransformer<TModel, TResource>(
  transformFn: (model: TModel) => TResource
): ResourceTransformer<TModel, TResource> {
  return new (class extends ResourceTransformer<TModel, TResource> {
    transform(model: TModel): TResource {
      return transformFn(model)
    }
  })()
}
