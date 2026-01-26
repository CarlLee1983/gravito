# Pothos Integration Guide

[Pothos](https://pothos-graphql.dev/) is a powerful code-first schema builder for GraphQL. It works seamlessly with `@gravito/graphql` (which uses GraphQL Yoga).

## 📦 Installation

```bash
bun add @pothos/core
```

## 🚀 Quick Start

### 1. Create the Schema Builder

It is recommended to create a shared `builder.ts` file.

```typescript
// builder.ts
import SchemaBuilder from '@pothos/core';
import type { GraphQLContext } from '@gravito/graphql';

// Define the context type for Pothos
export const builder = new SchemaBuilder<{
  Context: GraphQLContext;
}>({});

// Initialize Query Type
builder.queryType({});
```

### 2. Define Resolvers

```typescript
// schema.ts
import { builder } from './builder';

builder.queryField('hello', (t) =>
  t.string({
    args: {
      name: t.arg.string(),
    },
    resolve: (parent, { name }, context) => {
      // Access Gravito Context
      const userAgent = context.gravito.req.header('user-agent');
      return `Hello, ${name || 'World'}! (UA: ${userAgent})`;
    },
  })
);

export const schema = builder.toSchema();
```

### 3. Integrate with Gravito

```typescript
// app.ts
import { PlanetCore } from '@gravito/core';
import { OrbitGraphQL } from '@gravito/graphql';
import { schema } from './schema';

const core = new PlanetCore();

// Register the Orbit with the Pothos schema
await core.orbit(
  new OrbitGraphQL({
    schema,
    path: '/graphql',
  })
);

export default core.liftoff();
```

## 🧩 Using Plugins

Pothos has a rich plugin ecosystem. For example, to use the Validation plugin:

```bash
bun add @pothos/plugin-validation zod
```

```typescript
// builder.ts
import SchemaBuilder from '@pothos/core';
import ValidationPlugin from '@pothos/plugin-validation';

export const builder = new SchemaBuilder({
  plugins: [ValidationPlugin],
  validationOptions: {
    validationError: (zodError, args, context, info) => {
      // Custom error handling
      return zodError;
    },
  },
});
```

## 🔄 Integration with Dependency Injection

You can access the Gravito Container via the context if you bind services to the request context, or simply use module-level singletons if your architecture permits.

If you need to access IoC services in resolvers:

```typescript
builder.queryField('users', (t) =>
  t.field({
    type: [UserType],
    resolve: async (parent, args, context) => {
      // Assuming you attached the container or services to GravitoContext
      // or use the global container if available
      const userService = context.gravito.get('userService'); 
      return userService.findAll();
    },
  })
);
```
