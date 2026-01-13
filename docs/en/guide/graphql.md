# GraphQL

Gravito provides a powerful, zero-configuration GraphQL integration powered by [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server). This allows you to rapidly build high-performance GraphQL APIs while leveraging Gravito's robust backend capabilities.

## Introduction

The `@gravito/graphql` package (OrbitGraphQL) brings the modern GraphQL ecosystem into Gravito. It features:

- **Zero-Config Start:** Mount the orbit and get a working GraphQL server with GraphiQL immediately.
- **High Performance:** Built on `graphql-yoga` and optimized for Bun.
- **Seamless Integration:** Full access to `GravitoContext` (User, Request, Container) within your resolvers.
- **Standard Compliant:** Supports all standard GraphQL features (Queries, Mutations, Subscriptions).

## Installation

Install the package and its peer dependencies:

```bash
bun add @gravito/graphql graphql graphql-yoga
```

## Quick Start

### 1. Register the Orbit

Add `OrbitGraphQL` to your application configuration in `bootstrap.ts` or wherever you initialize `PlanetCore`.

```typescript
import { defineConfig, PlanetCore } from '@gravito/core'
import { OrbitGraphQL } from '@gravito/graphql'

const config = defineConfig({
  orbits: [
    OrbitGraphQL
  ]
})

const app = await PlanetCore.boot(config)
export default app.liftoff()
```

That's it! Your application now has a GraphQL endpoint at `/graphql`. You can open your browser to `http://localhost:3000/graphql` to access the GraphiQL playground.

### 2. Define Your Schema

By default, Gravito provides a sample "Hello World" schema. You can provide your own schema using the `GRAPHQL_SCHEMA` configuration key.

```typescript
import { createSchema } from 'graphql-yoga'

const schema = createSchema({
  typeDefs: `
    type Query {
      hello(name: String): String
      version: String
    }
  `,
  resolvers: {
    Query: {
      hello: (_, { name }) => `Hello, ${name || 'Gravito'}!`,
      version: () => '1.0.0'
    }
  }
})

const config = defineConfig({
  config: {
    // Inject your schema here
    GRAPHQL_SCHEMA: schema
  },
  orbits: [OrbitGraphQL]
})
```

## Advanced Usage

### Accessing Context

Gravito automatically injects the `GravitoContext` into the GraphQL context under the `gravito` key. This gives you access to the underlying request, user authentication, dependency injection container, and more.

```typescript
const resolvers = {
  Query: {
    me: (_, __, context) => {
      // Access Gravito Context
      const ctx = context.gravito
      
      // Access Request Headers
      const userAgent = ctx.req.header('User-Agent')
      
      // Access Authentication (if OrbitSentinel is installed)
      // const user = ctx.get('auth').user()
      
      return { userAgent }
    }
  }
}
```

### Custom Endpoint

You can customize the GraphQL endpoint path by passing options to the `OrbitGraphQL` constructor.

```typescript
const config = defineConfig({
  orbits: [
    new OrbitGraphQL({ 
      path: '/api/v1/query' // Custom path
    })
  ]
})
```

### Service Provider Pattern

For larger applications, you might want to bind your schema within a Service Provider instead of the config object. This allows you to build your schema dynamically using services from the container.

```typescript
// app/providers/GraphQLServiceProvider.ts
import { ServiceProvider } from '@gravito/core'
import { createSchema } from 'graphql-yoga'

export class GraphQLServiceProvider extends ServiceProvider {
  async register(container) {
    const schema = createSchema({ /* ... */ })
    
    // Bind to the specific key expected by OrbitGraphQL
    container.instance('GRAPHQL_SCHEMA', schema)
  }
}
```

## Code-First Schema

While Gravito works great with standard Schema-First design (SDL), we highly recommend using libraries like **Pothos** or **TypeGraphQL** for a type-safe, Code-First experience. Since `graphql-yoga` accepts any standard `GraphQLSchema`, you can use any schema builder you prefer.

Example with Pothos:

```typescript
import SchemaBuilder from '@pothos/core'

const builder = new SchemaBuilder({})

builder.queryType({
  fields: (t) => ({
    hello: t.string({
      resolve: () => 'Hello from Pothos!',
    }),
  }),
})

const schema = builder.toSchema()

// Pass this schema to Gravito config
```
