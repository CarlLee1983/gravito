# Phase 2: Type Safety & Developer Experience

> Enhance type inference and eliminate `any` types

## Overview

This phase focuses on improving TypeScript experience and providing full type inference for validated data. Currently, developers need to manually type `ctx.get('validated')`, which is error-prone.

## Current Type Safety Issues

### 1. Generic Type Constraint
```typescript
export abstract class FormRequest<T = unknown> {
  abstract schema: T
  // T is unconstrained - can be anything!
}
```

**Problems:**
- `T = unknown` provides no type safety
- No relationship between schema type and validated data
- Schema inference doesn't work with different libraries

### 2. Manual Type Casting
```typescript
// Current DX - Manual and error-prone
export class UserController {
  store(ctx: Context) {
    const data = ctx.get('validated') as {  // ❌ Manual typing
      name: string
      email: string
      age?: number
    }
    return ctx.json({ user: data })
  }
}
```

### 3. No Schema Inference
Different schema libraries have different inference patterns:
- **Zod**: `z.infer<typeof schema>`
- **Valibot**: `InferInput<typeof schema>` / `InferOutput<typeof schema>`

## Target Type Safety

### 1. Constrained Generics
```typescript
// For Zod schemas
export abstract class FormRequest<
  TSchema extends ZodSchema = ZodSchema,
  TData = z.infer<TSchema>
> {
  abstract schema: TSchema
}

// For Valibot schemas
export abstract class FormRequest<
  TSchema extends ValibotSchema = ValibotSchema,
  TData = v.InferInput<TSchema>
> {
  abstract schema: TSchema
}
```

### 2. Automatic Type Inference
```typescript
// Target DX - Fully typed without manual casting
export class UserController {
  store(ctx: Context) {
    const data = ctx.get('validated')  // ✅ Automatically typed!
    //    ^? { name: string; email: string; age?: number }
    return ctx.json({ user: data })
  }
}
```

### 3. Router Integration
```typescript
// Router should preserve typing
router.post('/users', StoreUserRequest, (ctx) => {
  const data = ctx.get('validated')
  //    ^? Inferred from StoreUserRequest schema
})
```

## Implementation Strategy

### Option A: Overloaded Classes (Recommended)
Create separate classes for different schema types:

```typescript
// src/core/FormRequestBase.ts
export abstract class FormRequestBase<TData = unknown> {
  abstract validate(ctx: Context): Promise<ValidationResult<TData>>
  // Common functionality
}

// src/core/ZodFormRequest.ts
export abstract class ZodFormRequest<
  TSchema extends ZodSchema
> extends FormRequestBase<z.infer<TSchema>> {
  abstract schema: TSchema
}

// src/core/ValibotFormRequest.ts
export abstract class ValibotFormRequest<
  TSchema extends ValibotSchema
> extends FormRequestBase<v.InferInput<TSchema>> {
  abstract schema: TSchema
}

// src/core/FormRequest.ts - Union type
export type FormRequest<TSchema = unknown> = 
  | ZodFormRequest<TSchema extends ZodSchema ? TSchema : never>
  | ValibotFormRequest<TSchema extends ValibotSchema ? TSchema : never>
```

### Option B: Conditional Types (Complex)
Use conditional types to determine schema library:

```typescript
type InferSchemaData<T> = 
  T extends ZodSchema ? z.infer<T> :
  T extends ValibotSchema ? v.InferInput<T> :
  unknown

export abstract class FormRequest<
  TSchema = unknown,
  TData = InferSchemaData<TSchema>
> {
  abstract schema: TSchema
}
```

### Option C: Generic Helpers (Simple)
Provide typed factory functions:

```typescript
export function zodFormRequest<TSchema extends ZodSchema>(
  schema: TSchema
) {
  return class extends FormRequest<TSchema> {
    schema = schema
  } as new() => FormRequest<TSchema, z.infer<TSchema>>
}

export function valibotFormRequest<TSchema extends ValibotSchema>(
  schema: TSchema
) {
  return class extends FormRequest<TSchema> {
    schema = schema
  } as new() => FormRequest<TSchema, v.InferInput<TSchema>>
}
```

## Context Variable Typing

### Current Issue
```typescript
// @gravito/core module augmentation
declare module '@gravito/core' {
  interface GravitoVariables {
    validated?: unknown  // ❌ No type safety
  }
}
```

### Target Solution
```typescript
// Enhanced module augmentation
declare module '@gravito/core' {
  interface GravitoVariables {
    validated?: unknown  // Default fallback
  }

  // Context with typed validated data
  interface TypedGravitoContext<TData = unknown> extends GravitoContext {
    get(key: 'validated'): TData
    get<K extends keyof GravitoVariables>(key: K): GravitoVariables[K]
  }
}

// Router should return typed context
export interface TypedRouteHandler<TData = unknown> {
  (ctx: TypedGravitoContext<TData>): Response | Promise<Response>
}
```

## Router Integration Enhancement

### Current Router API
```typescript
router.post('/users', StoreUserRequest, [UserController, 'store'])
//                                       ^? Handler gets untyped Context
```

### Enhanced Router API
```typescript
// Type-safe route registration
router.post('/users', StoreUserRequest, (ctx) => {
  //                                    ^? TypedGravitoContext<StoreUserData>
  const data = ctx.get('validated')
  //    ^? Automatically inferred from StoreUserRequest
})

// Class-based handlers with typing
router.post('/users', StoreUserRequest, [UserController, 'store'])
//                                      ^? TypedRouteHandler<StoreUserData>
```

### Implementation in Core Package
```typescript
// In @gravito/core/src/Router.ts
class Router {
  post<TRequest extends FormRequestClass>(
    path: string,
    request: TRequest,
    handler: TypedRouteHandler<InferFormRequestData<TRequest>>
  ): Route {
    // Implementation with proper type flow
  }
}

// Type inference helper
type InferFormRequestData<T> = 
  T extends ZodFormRequest<infer S> ? z.infer<S> :
  T extends ValibotFormRequest<infer S> ? v.InferInput<S> :
  unknown
```

## Validation Result Typing

### Current Return Type
```typescript
async validate(ctx: Context): Promise<
  { success: true; data: unknown } | 
  { success: false; error: ValidationErrorResponse }
>
```

### Enhanced Return Type
```typescript
async validate(ctx: Context): Promise<
  | { success: true; data: TData }
  | { success: false; error: ValidationErrorResponse }
>

// With branded types for better error handling
type ValidationResult<TData> = 
  | ValidationSuccess<TData>
  | ValidationFailure

interface ValidationSuccess<TData> {
  readonly success: true
  readonly data: TData
}

interface ValidationFailure {
  readonly success: false
  readonly error: ValidationErrorResponse
}
```

## Utility Types

### Schema Type Guards
```typescript
export function isZodSchema(schema: unknown): schema is ZodSchema {
  return schema != null && 
    typeof schema === 'object' && 
    'safeParse' in schema
}

export function isValibotSchema(schema: unknown): schema is ValibotSchema {
  return schema != null && 
    typeof schema === 'object' && 
    ('_run' in schema || 'parse' in schema) &&
    !('safeParse' in schema)
}
```

### Inference Utilities
```typescript
export type InferZodData<T extends ZodSchema> = z.infer<T>
export type InferValibotData<T extends ValibotSchema> = v.InferInput<T>

export type InferSchemaData<T> = 
  T extends ZodSchema ? InferZodData<T> :
  T extends ValibotSchema ? InferValibotData<T> :
  never
```

## Migration Strategy

### Backward Compatibility
- Existing `FormRequest` class remains unchanged
- New typed classes are additive
- Migration can be gradual

### Development Experience
```typescript
// Before (manual typing)
class StoreUserRequest extends FormRequest {
  schema = z.object({
    name: z.string(),
    email: z.string().email()
  })
}

// After (automatic typing)
class StoreUserRequest extends ZodFormRequest<typeof schema> {
  schema = z.object({
    name: z.string(),
    email: z.string().email()
  })
}
// Now ctx.get('validated') is automatically typed as { name: string; email: string }
```

## Implementation Tasks

### Task 2.1: Create Typed Base Classes
- [ ] `FormRequestBase<TData>` - Common functionality
- [ ] `ZodFormRequest<TSchema>` - Zod-specific implementation
- [ ] `ValibotFormRequest<TSchema>` - Valibot-specific implementation

### Task 2.2: Enhance Context Typing
- [ ] `TypedGravitoContext<TData>` interface
- [ ] Module augmentation improvements
- [ ] Type-safe `get('validated')` method

### Task 2.3: Update Router Integration
- [ ] Typed route handler interfaces
- [ ] Enhanced router methods with type inference
- [ ] Automatic FormRequest data type flow

### Task 2.4: Add Utility Types
- [ ] Schema type guards
- [ ] Type inference utilities
- [ ] Validation result branded types

### Task 2.5: Provide Migration Helpers
- [ ] Factory functions for easy adoption
- [ ] Codemods for automated migration
- [ ] Documentation with examples

## Testing Strategy

### Type Tests
```typescript
// Type-level tests using TypeScript compiler
expectType<{ name: string; email: string }>(
  await validateUserRequest(mockContext)
)

expectError(
  invalidSchemaRequest.schema // Should not compile
)
```

### Runtime Tests
- Ensure type inference works correctly
- Validate error types are preserved
- Test router integration maintains types

## Success Criteria

- [ ] Zero `any` types in public API
- [ ] Full type inference for `ctx.get('validated')`
- [ ] Type-safe router integration
- [ ] Branded validation result types
- [ ] 100% backward compatibility
- [ ] Comprehensive type tests

## Benefits

### For Developers
- **Zero manual type casting** - Types flow automatically
- **Better IDE experience** - Full IntelliSense support
- **Compile-time safety** - Catch type errors early
- **Refactoring confidence** - Type system prevents breaking changes

### For Framework
- **Professional API** - No `any` types visible to users
- **Better DX** - Reduces friction and learning curve
- **Type documentation** - Types serve as inline documentation

---

**Next**: [Phase 3: Performance Optimization](./PHASE-3-PERFORMANCE.md)