import { DB, type Model, type ModelStatic } from '@gravito/atlas'

export const AtlasMutationFactory = {
  create: async (model: ModelStatic<Model>, input: Record<string, unknown>) => {
    return await model.create(input)
  },

  createBatch: async (model: ModelStatic<Model>, inputs: Record<string, unknown>[]) => {
    return await DB.transaction(async () => {
      const results: Model[] = []
      for (const input of inputs) {
        results.push(await model.create(input))
      }
      return results
    })
  },

  update: async (
    model: ModelStatic<Model>,
    id: string | number,
    input: Record<string, unknown>
  ) => {
    const instance = await model.find(id)
    if (!instance) {
      throw new Error(`${model.name} with ID ${id} not found`)
    }
    const instanceObj = instance as unknown as Record<string, unknown>
    if (typeof instanceObj.fill === 'function') {
      ;(instance as unknown as { fill: (data: Record<string, unknown>) => void }).fill(input)
    } else {
      for (const [key, value] of Object.entries(input)) {
        instanceObj[key] = value
      }
    }
    await instance.save()
    return instance
  },

  updateBatch: async (
    model: ModelStatic<Model>,
    inputs: { id: string | number; input: Record<string, unknown> }[]
  ) => {
    return await DB.transaction(async () => {
      const results: Model[] = []
      for (const { id, input } of inputs) {
        results.push(await AtlasMutationFactory.update(model, id, input))
      }
      return results
    })
  },

  delete: async (model: ModelStatic<Model>, id: string | number) => {
    const instance = await model.find(id)
    if (!instance) return false
    await instance.delete()
    return true
  },
}
