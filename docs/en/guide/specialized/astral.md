# Astral OpenAPI

Astral is Gravito's solution for API documentation. It generates **OpenAPI 3.1** specifications and serves a built-in Swagger UI, utilizing a **Shadow Contract** approach that keeps your controllers clean and decorator-free.

## Introduction

In many frameworks, documentation logic pollutes your controllers with endless decorators (`@ApiOperation`, `@ApiResponse`, etc.). Astral takes a different approach:

*   **Logic Separation:** Define API metadata in separate contract files.
*   **Automatic Inference:** It reads your Zod schemas (from `Mass` or `Impulse`) to generate schemas automatically.
*   **Live Documentation:** The Swagger UI updates automatically as you change your schemas.

## Installation

```bash
bun add @gravito/astral
```

## Quick Start

### 1. Define Schemas & Requests

Astral works best with Zod schemas. If you are using `@gravito/impulse` for validation, you are already halfway there.

```typescript
// src/dtos.ts
import { z } from 'zod'
import { FormRequest } from '@gravito/impulse'

export const UserDTO = z.object({
  id: z.number(),
  name: z.string().describe('The user\'s full name'),
  email: z.string().email().describe('Verified email address')
})

export class CreateUserRequest extends FormRequest {
  schema = z.object({
    name: z.string().min(2),
    email: z.string().email()
  })
}
```

### 2. Create a Shadow Contract

A Shadow Contract maps your API routes to input/output schemas. This file usually lives alongside your controllers or in a dedicated `contracts/` directory.

```typescript
// src/contracts/UserContract.ts
import { astral } from '@gravito/astral'
import { CreateUserRequest, UserDTO } from '../dtos'

export const UserContract = astral.resource('/api/users', {

  tags: ['User Management'],

  operations: {

    index: {

      summary: 'List all users',

      description: 'Returns a paginated list of users.',

      output: [UserDTO] // Automatically infers array response

    },

    store: {

      summary: 'Register a new user',

      input: CreateUserRequest, // Extracts schema from FormRequest

      output: UserDTO

    }

  }

})

```



### 3. Register the Orbit



Mount the `OrbitAstral` in your application boot process. Pass your contracts to the configuration.



```typescript

// src/bootstrap.ts

import { defineConfig, PlanetCore } from '@gravito/core'

import { OrbitAstral } from '@gravito/astral'

import { UserContract } from './contracts/UserContract'



const config = defineConfig({

  orbits: [

    // ... other orbits

    OrbitAstral.configure({

      title: 'My Galaxy API',

      version: '1.0.0',

      description: 'Documentation for the Galaxy API service.',

      contracts: [UserContract],

      uiPath: '/docs',

      jsonPath: '/openapi.json'

    })

  ]

})



Now, navigate to `http://localhost:3000/docs` to explore your API!

## Advanced Usage

### Grouping Contracts

For larger applications, you can organize contracts by domain.

```typescript
const CommerceContracts = [
  ProductContract,
  OrderContract,
  CartContract
]

OrbitAstral.configure({
  contracts: [
    ...AuthContracts,
    ...CommerceContracts
  ]
})
```

### Customizing Operations

Each operation in a contract supports extensive customization options mapping to OpenAPI fields.

```typescript
astral.route('POST', '/api/upload', {
  tags: ['Media'],
  summary: 'Upload file',
  input: {
    contentType: 'multipart/form-data',
    schema: z.object({
      file: z.any().describe('Binary file data')
    })
  },
  responses: {
    200: { description: 'Upload success', schema: FileDTO },
    400: { description: 'Invalid file type' }
  },
  security: [{ bearerAuth: [] }]
})
```

### Authentication

You can define security schemes globally in the config.

```typescript
OrbitAstral.configure({
  // ...
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT'
    }
  },
  security: [{ bearerAuth: [] }] // Apply globally
})
```
