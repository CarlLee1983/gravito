# GraphQL Orbit for Gravito

**@gravito/graphql** brings the power of GraphQL to the Gravito ecosystem with zero friction. Powered by `graphql-yoga`, it provides a high-performance, standards-compliant GraphQL server that integrates seamlessly with Gravito's dependency injection and HTTP layer.

## 🌟 Vision

- **Zero Config**: Just mount the Orbit and you have a `/graphql` endpoint with GraphiQL.
- **Performance**: Built on `graphql-yoga` and `bun`, offering standard-setting speed.
- **Type Safety**: Encourages Code-First approaches (Pothos) or Schema-First with strong typing.
- **Integration**: Access `GravitoContext` (services, DB, user) directly in your resolvers.

## 📦 Installation

```bash
bun add @gravito/graphql graphql graphql-yoga
```

## 🚀 Usage

### 1. Register the Orbit

In your `bootstrap.ts` or `index.ts`:

```typescript
import { defineConfig, PlanetCore } from '@gravito/core'
import { OrbitGraphQL } from '@gravito/graphql'

const config = defineConfig({
  orbits: [
    OrbitGraphQL
  ]
})

const app = await PlanetCore.boot(config)
```

### 2. Define Schema (Simple Mode)

By default, `OrbitGraphQL` looks for a schema definition. You can provide it via config:

```typescript
import { createSchema } from 'graphql-yoga'

const schema = createSchema({
  typeDefs: `
    type Query {
      hello: String
    }
  `,
  resolvers: {
    Query: {
      hello: () => 'Hello from Gravito Galaxy!'
    }
  }
})

// Pass to config
const config = defineConfig({
  config: {
    GRAPHQL_SCHEMA: schema
  },
  orbits: [OrbitGraphQL]
})
```

## 🔧 Architecture

The `OrbitGraphQL` does the following:

1.  **Boot Phase**: Reads `GRAPHQL_SCHEMA` from the container or config.
2.  **Mount Phase**: Creates a `yoga` instance and mounts it to `GET/POST /graphql`.
3.  **Context Injection**: Wraps the request to inject `GravitoContext` into the GraphQL context, allowing resolvers to use `ctx.make(Service)`.

## 🛣️ Roadmap

- [ ] **Phase 1**: Basic `OrbitGraphQL` implementation with `graphql-yoga`.
- [ ] **Phase 2**: Integration with `Pothos` for type-safe schema building.
- [ ] **Phase 3**: Integration with `@gravito/atlas` for auto-generated CRUD resolvers.
