# Astral API Reference

This document provides a detailed reference for the types and interfaces used in `@gravito/astral`.

## Core Interfaces

### AstralConfig

The global configuration object for setting up the Astral OpenAPI generator.

```typescript
interface AstralConfig {
  /** The API title shown in the documentation UI */
  title?: string;
  /** The API version string (e.g., '1.0.0') */
  version?: string;
  /** Brief description of the entire API */
  description?: string;
  /** List of predefined resource contracts */
  contracts?: AstralResource[];
  /** The URL path where the Swagger UI will be served (default: '/docs') */
  uiPath?: string;
  /** The URL path where the OpenAPI JSON spec will be served (default: '/openapi.json') */
  jsonPath?: string;
  /** Shorthand for uiPath */
  path?: string;
  /** Server definitions for OpenAPI */
  servers?: OpenAPIServer[];
  /** Global security schemes (components/securitySchemes) */
  securitySchemes?: Record<string, SecurityScheme>;
  /** Global security requirements applied to all operations */
  security?: SecurityRequirement[];
  /** Global tags definitions */
  tags?: TagObject[];
  /** External documentation link */
  externalDocs?: ExternalDocumentation;
  /** Reusable components (schemas, responses, parameters, etc.) */
  components?: ComponentsObject;
}
```

### AstralResource

Defines a resource contract that maps a base path to various operations.

```typescript
interface AstralResource {
  /** The base resource path (e.g., '/users') */
  path: string;
  /** Default tags applied to all operations in this resource */
  tags?: string[];
  /** Map of operation names to their definitions */
  operations: {
    index?: AstralOperation;   // GET /path
    show?: AstralOperation;    // GET /path/:id
    store?: AstralOperation;   // POST /path
    update?: AstralOperation;  // PUT /path/:id
    destroy?: AstralOperation; // DELETE /path/:id
    [key: string]: AstralOperation | undefined; // Custom operations
  };
}
```

### AstralOperation

Defines the metadata for a specific API operation.

```typescript
interface AstralOperation {
  /** Short summary of the operation */
  summary?: string;
  /** Detailed description of the operation */
  description?: string;
  /** Tags for categorization */
  tags?: string[];
  /** Input validation schema (FormRequest class or Zod schema) */
  input?: FormRequestClass | ZodSchema;
  /** Output validation schema for successful responses */
  output?: ZodSchema | ZodSchema[];
  /** Map of error status codes to descriptions or Zod schemas */
  errors?: Record<number, string | ZodSchema>;
  /** HTTP status code for success (default: 200) */
  status?: number;
  /** Path parameter schemas */
  params?: Record<string, ZodSchema>;
  /** Unique operation identifier */
  operationId?: string;
  /** Mark as deprecated */
  deprecated?: boolean;
  /** Security requirements for this operation */
  security?: SecurityRequirement[];
  /** Custom request body definition (overrides input) */
  requestBody?: RequestBodyObject;
  /** Examples for request and response */
  examples?: {
    request?: Record<string, ExampleObject>;
    response?: Record<string, ExampleObject>;
  };
  /** External docs for this operation */
  externalDocs?: ExternalDocumentation;
}
```

## Helper Types

### OpenAPIServer

```typescript
interface OpenAPIServer {
  url: string;
  description?: string;
  variables?: Record<string, {
    default: string;
    description?: string;
    enum?: string[];
  }>;
}
```

### SecurityScheme

```typescript
interface SecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect' | 'mutualTLS';
  description?: string;
  name?: string; // Required for apiKey
  in?: 'query' | 'header' | 'cookie'; // Required for apiKey
  scheme?: string; // Required for http
  bearerFormat?: string;
  flows?: any; // Required for oauth2
  openIdConnectUrl?: string; // Required for openIdConnect
}
```

### Type Inference Helpers

Astral provides TypeScript helpers to infer types from your operation definitions:

```typescript
import type { InferInput, InferOutput, InferParams, InferErrors } from '@gravito/astral';

// Example Usage
type CreateUserBody = InferInput<typeof UserResource.operations.store>;
type UserResponse = InferOutput<typeof UserResource.operations.show>;
```

## Classes

### OrbitAstral

The main entry point for integrating Astral with the Gravito application.

#### Methods

- **`constructor(config: AstralConfig)`**
  Initialize Astral with configuration.

- **`resource(path: string, contract: Omit<AstralResource, 'path'>): this`**
  Register a new resource contract dynamically.

- **`install(app: Application): Promise<void>`**
  Installs the Swagger UI and OpenAPI JSON routes into the application.
