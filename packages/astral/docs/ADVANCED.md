# Advanced Usage Guide

This guide covers advanced configurations and features of `@gravito/astral`.

## Security Configuration

Astral supports standard OpenAPI security schemes (API Key, JWT Bearer, OAuth2, etc.).

### 1. Define Security Schemes

Define your security schemes in the global configuration:

```typescript
const astral = new OrbitAstral({
  securitySchemes: {
    // API Key Example
    ApiKeyAuth: {
      type: 'apiKey',
      in: 'header',
      name: 'X-API-KEY'
    },
    // JWT Bearer Example
    BearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT'
    }
  },
  // Apply globally if needed
  security: [
    { BearerAuth: [] }
  ]
});
```

### 2. Apply Security to Operations

You can override or add security requirements at the operation level:

```typescript
astral.resource('/admin', {
  operations: {
    index: {
      // Require both ApiKey AND BearerAuth
      security: [
        { ApiKeyAuth: [], BearerAuth: [] }
      ],
      // ...
    }
  }
});
```

## Reusable Components

You can define reusable schemas, responses, and parameters to keep your spec clean and avoid duplication.

```typescript
const astral = new OrbitAstral({
  components: {
    schemas: {
      User: UserSchema, // Zod schema
      Error: ErrorSchema
    },
    responses: {
      Unauthorized: {
        description: 'Unauthorized access',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      }
    }
  }
});
```

## Complex Request Bodies & Examples

For endpoints that require specific content types or examples:

```typescript
astral.resource('/upload', {
  operations: {
    store: {
      summary: 'Upload a file',
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: z.object({
              file: z.any(), // In real app use specific file type handling
              description: z.string()
            })
          }
        }
      },
      examples: {
        request: {
          'valid-upload': {
            summary: 'Valid file upload',
            value: { description: 'Profile picture' }
          }
        }
      }
    }
  }
});
```

## Error Handling & Status Codes

Define explicit error responses for your operations:

```typescript
astral.resource('/users', {
  operations: {
    show: {
      output: UserSchema,
      errors: {
        404: 'User not found', // Simple string description
        400: z.object({        // Detailed schema
          code: z.string(),
          message: z.string()
        })
      }
    }
  }
});
```

## Path Parameters

Astral automatically extracts parameters from your route paths (e.g., `/users/:id`). However, you can explicitly define them to add descriptions or validation:

```typescript
astral.resource('/users/:id', {
  operations: {
    show: {
      params: {
        id: z.string().uuid().describe('The UUID of the user')
      },
      // ...
    }
  }
});
```
