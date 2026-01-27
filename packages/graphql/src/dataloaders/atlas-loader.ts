import { eagerLoad, getRelationships, type Model, type ModelStatic } from '@gravito/atlas'
import DataLoader from 'dataloader'

/**
 * Creates DataLoaders for all relationships in the given models.
 *
 * @param models List of Atlas models to generate loaders for
 * @returns A record of DataLoaders indexed by "ModelName.relationName"
 */
export function createAtlasLoaders(
  models: ModelStatic<Model>[]
): Record<string, DataLoader<Model, unknown>> {
  const loaders: Record<string, DataLoader<Model, unknown>> = {}

  for (const model of models) {
    const relations = getRelationships(model as unknown as typeof Model)

    for (const [relName] of relations) {
      const loaderKey = `${model.name}.${relName}`

      loaders[loaderKey] = new DataLoader<Model, unknown, string>(
        async (parents) => {
          await eagerLoad([...parents], relName)
          return parents.map((p) => (p as unknown as Record<string, unknown>)[relName])
        },
        {
          cacheKeyFn: (m) => {
            const pk = (m.constructor as typeof Model).primaryKey || 'id'
            return `${m.constructor.name}:${(m as unknown as Record<string, unknown>)[pk]}`
          },
        }
      )
    }
  }

  return loaders
}
