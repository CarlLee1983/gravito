# GraphQL

Gravito provides a powerful, zero-configuration GraphQL integration powered by [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server). This allows you to rapidly build high-performance GraphQL APIs while leveraging Gravito's robust backend capabilities.

## Introduction

The `@gravito/graphql` package (OrbitGraphQL) brings the modern GraphQL ecosystem into Gravito. It features:

- **Zero-Config Start:** Mount the orbit and get a working GraphQL server with GraphiQL immediately.
- **High Performance:** Built on `graphql-yoga` and optimized for Bun.
- **Seamless Integration:** Full access to `GravitoContext` (User, Request, Container) within your resolvers.
- **Automated Schema Generation:** Generate full CRUD schemas directly from your Atlas models.
- **Advanced Filtering:** Built-in support for nested logical operators and relational attribute filtering.

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

### 2. Automated Schema with Atlas

One of the most powerful features of Gravito GraphQL is its ability to generate a complete schema from your [Atlas Models](../api/atlas/models.md).

```typescript
import { OrbitGraphQL, createAtlasSchema } from '@gravito/graphql'
import { User, Post } from './models'

const schema = await createAtlasSchema({
  models: [User, Post]
})

const config = defineConfig({
  config: {
    GRAPHQL_SCHEMA: schema
  },
  orbits: [OrbitGraphQL]
})
```

This automatically generates:
- **Types**: `User` and `Post` types based on your database schema.
- **Queries**: `user(id: ID!)` and `users(where: UserWhereInput, orderBy: UserOrderByInput, limit: Int, offset: Int)`.
- **Mutations**: `createUser`, `updateUser`, `deleteUser`.
- **Relationships**: Automatically resolves links between models (e.g., `User.posts`).

## Advanced Filtering

Gravito GraphQL provides enterprise-grade filtering capabilities out of the box when using `createAtlasSchema`.

### Logical Operators

Combine multiple conditions using `_and`, `_or`, and `_not`.

```graphql
query {
  users(where: {
    _or: [
      { name: { startsWith: "Admin" } },
      { email: { contains: "@company.com" } }
    ],
    _not: { status: { eq: "banned" } }
  }) {
    id
    name
  }
}
```

### Relational Filtering

Filter models based on the attributes of their related entities.

```graphql
query {
  # Find users who have posts containing "GraphQL" in the title
  users(where: {
    posts: {
      title: { contains: "GraphQL" }
    }
  }) {
    name
    posts {
      title
    }
  }
}
```

### Automatic Batching (DataLoader)

Gravito automatically solves the N+1 query problem for relationships when using `createAtlasSchema`. It includes a built-in DataLoader factory that batches relationship loading into a single `WHERE IN` query.

To enable it, simply use the `createAtlasLoaders` utility in your context:

```typescript
import { createAtlasLoaders } from '@gravito/graphql'
import { User, Post } from './models'

const models = [User, Post]

const config = defineConfig({
  orbits: [
    new OrbitGraphQL({
      dataLoaders: (ctx) => createAtlasLoaders(models)
    })
  ]
})
```

Once configured, any relational access like `users { posts { title } }` will result in exactly two database queries, regardless of the number of users.

### Available Scalar Filters

| Scalar | Supported Operators |
|---|---|
| **String** | `eq`, `like`, `in`, `contains`, `startsWith`, `endsWith`, `match` (Regex) |
| **Int / Float** | `eq`, `gt`, `lt`, `gte`, `lte`, `in`, `between` |
| **DateTime** | `eq`, `gt`, `lt`, `gte`, `lte`, `in`, `between` |
| **Boolean** | `eq` |
| **JSON** | `eq` |

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

### Custom Scalars

The framework includes built-in support for common complex types:
- `JSON`: Safe handling of JSON objects.
- `DateTime`: ISO-8601 compliant date strings.
- `BigInt`: Safe handling of 64-bit integers.

These are automatically used by `createAtlasSchema` when it detects corresponding column types in your database.

### Performance & Security

OrbitGraphQL includes built-in protections and optimizations:

- **Complexity Limiting**: Prevent DoS attacks from expensive queries.
- **Depth Limiting**: Restrict query nesting depth.
- **APQ**: Automatic Persisted Queries for reduced bandwidth.
- **Response Caching**: Built-in TTL-based response cache.

See the [Optimization Guide](./performance.md) for more details on tuning these settings.
