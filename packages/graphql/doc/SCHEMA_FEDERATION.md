# Distributed Schema Strategy

In a **Galaxy Architecture**, business logic is split into isolated Satellites. `@gravito/graphql` provides the "Gateway" to unify these isolated domains into a single API.

## 1. Schema Registration in Satellites

Each Satellite should register its part of the GraphQL schema during the `BOOT` phase.

```typescript
// satellites/catalog/src/CatalogSatellite.ts
import { catalogSchema } from './graphql/schema'

export class CatalogSatellite extends Satellite {
  async boot(core: PlanetCore) {
    const graphql = core.container.resolve('graphql');
    // Aggregate schemas (requires GraphQL Yoga's schema merging logic)
    graphql.extendSchema(catalogSchema);
  }
}
```

## 2. Cross-Satellite Data Fetching

When one object in Satellite A needs data from Satellite B, use **DataLoaders** to avoid the N+1 problem.

```typescript
// Resolver in Satellite A (Order)
const resolvers = {
  Order: {
    customer: (order, args, context) => {
      // Use Beam to fetch user data from Membership Satellite
      return context.loaders.customer.load(order.customerId);
    }
  }
}
```

## 3. Query Complexity & Security

Protect the Galaxy from expensive queries that could destabilize your Satellites.

```typescript
OrbitGraphQL.configure({
  security: {
    depthLimit: 5,        // Prevent circular deep nesting
    complexityLimit: 500  // Limit based on field weights
  }
})
```

## 4. Persisted Queries (APQ)

Improve performance and security by using **Automatic Persisted Queries**. This reduces bandwidth and ensures only known queries are executed in production.

- **Development**: Allow all queries.
- **Production**: Clients send SHA256 hashes of queries. If the server doesn't have the query, the client sends the full query once to persist it.

## 5. Middleware & Auth (Fortify Integration)

GraphQL resolvers have full access to `GravitoContext`. Use `@gravito/fortify` to check permissions within your resolvers.

```typescript
user: (parent, args, context) => {
  const auth = context.gravito.get('auth');
  if (auth.denies('view-user-details')) {
    throw new GraphQLError('Unauthorized');
  }
  return auth.user();
}
```
