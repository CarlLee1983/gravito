export const SUBSCRIPTION_TYPE_DEFS = `
  extend type Subscription {
    _empty: String
  }
`

export const createSubscriptionResolver = (modelName: string) => {
  return {
    [`${modelName.toLowerCase()}Created`]: {
      subscribe: (_: unknown, __: unknown, context: import('../index').GraphQLContext) => {
        const signal = (
          context.gravito as unknown as {
            get: (name: string) => { subscribe: (ev: string) => unknown }
          }
        ).get('signal')
        return signal.subscribe(`${modelName.toLowerCase()}.created`)
      },
    },
  }
}
