# @gravito/graphql 🕸️

> **Zero-config GraphQL Orbit for Gravito, powered by GraphQL Yoga.**

`@gravito/graphql` provides a seamless integration of [GraphQL Yoga](https://the-guild.dev/graphql/yoga) into the Gravito ecosystem. It allows you to build high-performance, type-safe GraphQL APIs with minimal configuration while maintaining full access to Gravito's core features.

## 🌟 Features

- **⚡️ Powered by Yoga**: Leverages the performance and flexibility of GraphQL Yoga 5.
- **🛠️ Zero Config**: Automatically works out of the box with a default schema if none is provided.
- **🔗 Context Integration**: Seamlessly passes `GravitoContext` into your GraphQL resolvers as `gravito`.
- **🔌 Flexible Schema Resolution**: 
  - Pass a pre-built `GraphQLSchema` in the constructor.
  - Define `GRAPHQL_SCHEMA` in your application config.
  - Register `GRAPHQL_SCHEMA` in the IoC container.
- **🚀 Fully Type-Safe**: Written in TypeScript with complete type definitions for configuration and context.
- **🎨 Integrated Playground**: Comes with a built-in GraphQL IDE (GraphiQL) for easy testing in development.

## 📦 Installation

```bash
bun add @gravito/graphql graphql
```

## 🚀 Quick Start

Register the `OrbitGraphQL` in your application:

```typescript
import { PlanetCore } from '@gravito/core';
import { OrbitGraphQL } from '@gravito/graphql';
import { createSchema } from 'graphql-yoga';

const core = new PlanetCore();

const schema = createSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      hello: String
    }
  `,
  resolvers: {
    Query: {
      hello: () => 'Hello from Gravito!'
    }
  }
});

await core.orbit(new OrbitGraphQL({
  path: '/graphql', // Optional: defaults to /graphql
  schema: schema     // Optional: can also be resolved from container
}));

await core.liftoff();
```

Visit **`http://localhost:3000/graphql`** in your browser to open GraphiQL.

## ⚙️ Configuration

The `GraphQLConfig` object supports the following options:

| Option | Type | Default | Description |
|---|---|---|---|
| `path` | `string` | `'/graphql'` | The URL path where the GraphQL endpoint will be mounted. |
| `schema` | `GraphQLSchema` | `undefined` | A pre-built GraphQL schema instance. |

## 🔌 Accessing Gravito Context

The `GravitoContext` is automatically injected into the GraphQL context under the `gravito` key. You can access your services, user data, or request info directly in your resolvers:

```typescript
resolvers: {
  Query: {
    user: (parent, args, context) => {
      // Access Gravito Context
      const gravito = context.gravito;
      const auth = gravito.get('auth');
      
      return auth.user();
    }
  }
}
```

## 🛠️ Advanced: IoC Container Resolution

Instead of passing the schema directly to the constructor, you can register it in the Gravito container. This is useful for complex applications using dependency injection:

```typescript
core.container.singleton('GRAPHQL_SCHEMA', () => {
  return myComplexSchemaBuilder.build();
});

// The orbit will automatically find and use the registered schema
await core.orbit(new OrbitGraphQL());
```

## 📄 License

MIT © Carl Lee
