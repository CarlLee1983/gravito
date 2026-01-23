# Phase 5: Documentation & API Enhancement

> Comprehensive documentation and API surface improvements

## Overview

This phase focuses on improving documentation quality, API discoverability, and providing comprehensive guides for developers. The goal is to make `@gravito/impulse` the most developer-friendly validation library in the ecosystem.

## Current Documentation Analysis

### Existing Documentation
| File | Content | Quality | Completeness |
|------|---------|---------|---------------|
| `README.md` | Basic usage examples | Good | 70% |
| `README.zh-TW.md` | Chinese translation | Good | 60% |
| Source code | Limited JSDoc | Poor | 30% |
| Type definitions | Basic types | Fair | 50% |

### Documentation Gaps
- **API Reference**: No comprehensive API documentation
- **Advanced Examples**: Missing complex use cases
- **Migration Guides**: No upgrade/migration documentation
- **Best Practices**: No established patterns documentation
- **Troubleshooting**: No common issues guide
- **Integration Examples**: Limited framework integration examples

## Documentation Strategy

### 1. API Reference Documentation

#### Complete JSDoc Coverage
```typescript
/**
 * Base class for Form Request validation in Gravito applications.
 * 
 * FormRequest provides Laravel-style request validation with full TypeScript support.
 * It supports both Zod and Valibot schema libraries and integrates seamlessly with
 * Gravito's router system.
 * 
 * @example Basic Usage
 * ```typescript
 * import { FormRequest, z } from '@gravito/impulse'
 * 
 * export class CreateUserRequest extends FormRequest {
 *   schema = z.object({
 *     name: z.string().min(2, 'Name must be at least 2 characters'),
 *     email: z.string().email('Please enter a valid email'),
 *     age: z.number().int().min(18, 'Must be at least 18 years old').optional()
 *   })
 *   
 *   // Optional: Authorization check
 *   authorize(ctx: Context): boolean {
 *     return ctx.get('user')?.role === 'admin'
 *   }
 * }
 * ```
 * 
 * @example Router Integration
 * ```typescript
 * // Automatic middleware conversion
 * router.post('/users', CreateUserRequest, (ctx) => {
 *   const data = ctx.get('validated') // Fully typed!
 *   return ctx.json({ success: true, user: data })
 * })
 * ```
 * 
 * @template T - The schema type (Zod or Valibot schema)
 * @public
 * @since 1.0.0
 */
export abstract class FormRequest<T = unknown> {
  /**
   * The validation schema for this request.
   * 
   * Supports Zod and Valibot schemas. The schema defines the structure and
   * validation rules for incoming request data.
   * 
   * @example Zod Schema
   * ```typescript
   * schema = z.object({
   *   name: z.string().min(1),
   *   email: z.string().email()
   * })
   * ```
   * 
   * @example Valibot Schema
   * ```typescript
   * import * as v from 'valibot'
   * 
   * schema = v.object({
   *   name: v.pipe(v.string(), v.minLength(1)),
   *   email: v.pipe(v.string(), v.email())
   * })
   * ```
   */
  abstract schema: T

  /**
   * Data source for validation.
   * 
   * Determines where to extract data from the request:
   * - `'json'`: Request body as JSON (default)
   * - `'form'`: Form data (multipart/form-data)
   * - `'query'`: URL query parameters
   * - `'param'`: Route parameters
   * 
   * @default 'json'
   * 
   * @example Query Parameter Validation
   * ```typescript
   * export class SearchRequest extends FormRequest {
   *   source = 'query' as const
   *   schema = z.object({
   *     q: z.string().min(1),
   *     page: z.coerce.number().default(1)
   *   })
   * }
   * ```
   */
  source: DataSource = 'json'

  /**
   * Configuration options for the FormRequest.
   * 
   * @example Custom Error Handling
   * ```typescript
   * options = {
   *   errorStatus: 400, // Custom error status
   *   messageProvider: new CustomMessageProvider()
   * }
   * ```
   */
  options: FormRequestOptions = {}
}
```

#### Method Documentation
```typescript
/**
 * Authorization check for the request.
 * 
 * Override this method to implement custom authorization logic.
 * Return `false` to reject the request with a 403 Forbidden response.
 * 
 * @param ctx - The request context containing user info and other data
 * @returns `true` if authorized, `false` to reject
 * 
 * @example Role-based Authorization
 * ```typescript
 * authorize(ctx: Context): boolean {
 *   const user = ctx.get('user')
 *   return user?.role === 'admin' || user?.id === ctx.req.param('userId')
 * }
 * ```
 * 
 * @example Async Authorization
 * ```typescript
 * async authorize(ctx: Context): Promise<boolean> {
 *   const token = ctx.req.header('Authorization')
 *   const user = await verifyToken(token)
 *   return user?.permissions.includes('create:users')
 * }
 * ```
 */
authorize?(ctx: Context): boolean | Promise<boolean>
```

### 2. Comprehensive Usage Guide

#### Basic to Advanced Examples
```markdown
## Usage Guide

### 1. Basic Validation

Start with simple field validation:

```typescript
import { FormRequest, z } from '@gravito/impulse'

export class BasicRequest extends FormRequest {
  schema = z.object({
    name: z.string(),
    email: z.string().email()
  })
}
```

### 2. Advanced Validation

Complex nested objects and arrays:

```typescript
export class AdvancedRequest extends FormRequest {
  schema = z.object({
    user: z.object({
      profile: z.object({
        firstName: z.string().min(2),
        lastName: z.string().min(2),
        bio: z.string().max(500).optional()
      }),
      preferences: z.object({
        theme: z.enum(['light', 'dark']),
        notifications: z.boolean().default(true)
      })
    }),
    tags: z.array(z.string()).min(1).max(10),
    metadata: z.record(z.unknown()).optional()
  })
}
```

### 3. File Upload Handling

Handle multipart form data with files:

```typescript
export class FileUploadRequest extends FormRequest {
  source = 'form' as const
  
  schema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    file: z.instanceof(File).refine(
      file => file.size <= 10 * 1024 * 1024,
      'File size must be less than 10MB'
    )
  })
}
```

### 4. Custom Authorization

Implement complex authorization logic:

```typescript
export class AdminOnlyRequest extends FormRequest {
  schema = z.object({ action: z.string() })
  
  async authorize(ctx: Context): Promise<boolean> {
    // Check user role
    const user = ctx.get('user')
    if (user?.role !== 'admin') {
      return false
    }
    
    // Additional checks (e.g., rate limiting)
    const canPerformAction = await checkRateLimit(user.id)
    return canPerformAction
  }
  
  authorizationMessage(): string {
    return 'Admin access required for this action'
  }
}
```

### 5. Data Transformation

Transform data before validation:

```typescript
export class TransformRequest extends FormRequest {
  schema = z.object({
    email: z.string().email(),
    name: z.string().min(2)
  })
  
  transform(data: unknown): unknown {
    const d = data as Record<string, unknown>
    return {
      ...d,
      email: typeof d.email === 'string' ? d.email.toLowerCase() : d.email,
      name: typeof d.name === 'string' ? d.name.trim() : d.name
    }
  }
}
```
```

### 3. Integration Examples

#### Framework Integration Guide
```markdown
## Integration Guide

### With Gravito Router

```typescript
import { PlanetCore } from '@gravito/core'
import { CreateUserRequest } from './requests'

const core = new PlanetCore()

// Method 1: Direct integration (recommended)
core.router.post('/users', CreateUserRequest, [UserController, 'create'])

// Method 2: Explicit middleware
import { validateRequest } from '@gravito/impulse'
core.router.post('/users', validateRequest(CreateUserRequest), [UserController, 'create'])
```

### With Express.js

```typescript
import express from 'express'
import { validateRequest } from '@gravito/impulse'

const app = express()

app.post('/users', validateRequest(CreateUserRequest), (req, res) => {
  const data = req.validated // Typed validation data
  res.json({ success: true, user: data })
})
```

### With Fastify

```typescript
import fastify from 'fastify'

const server = fastify()

server.post('/users', {
  preHandler: validateRequest(CreateUserRequest)
}, async (request, reply) => {
  const data = request.validated
  return { success: true, user: data }
})
```

### Frontend Integration

```typescript
// With @gravito/impulse-bridge
import { ImpulseBridge } from '@gravito/impulse-bridge'

// Share validation schema with frontend
ImpulseBridge.share(ctx, 'createUser', CreateUserRequest)

// Frontend can now access validation rules
const blueprint = window.__GRAVITO_BLUEPRINTS__.createUser
// Use for client-side validation
```
```

### 4. Migration Guide

#### From v0.x to v1.x
```markdown
## Migration Guide

### Breaking Changes in v1.0

#### 1. Schema Property
```typescript
// Before (v0.x)
class OldRequest extends FormRequest {
  rules() {
    return z.object({ name: z.string() })
  }
}

// After (v1.x)
class NewRequest extends FormRequest {
  schema = z.object({ name: z.string() })
}
```

#### 2. Error Response Format
```typescript
// Before (v0.x)
{
  "errors": [
    { "field": "name", "message": "Required" }
  ]
}

// After (v1.x)
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "name", "message": "Required", "code": "invalid_type" }
    ]
  }
}
```

### Automated Migration

Use our migration script:

```bash
npx @gravito/impulse migrate ./src/requests/
```

### Manual Migration Steps

1. Update schema definition:
   - Replace `rules()` method with `schema` property
   - Ensure schema is a class property, not method

2. Update error handling:
   - Update frontend code to handle new error format
   - Use `error.details` instead of `errors`

3. Update type imports:
   - Import types from `@gravito/impulse` directly
   - Remove deprecated type imports
```

### 5. Best Practices Guide

#### Performance Best Practices
```markdown
## Best Practices

### Performance Optimization

#### 1. Schema Reuse
```typescript
// ✅ Good: Reuse schema objects
const userSchema = z.object({
  name: z.string(),
  email: z.string().email()
})

export class CreateUserRequest extends FormRequest {
  schema = userSchema
}

export class UpdateUserRequest extends FormRequest {
  schema = userSchema.partial() // Reuse with modifications
}
```

#### 2. Avoid Dynamic Schemas
```typescript
// ❌ Bad: Dynamic schema creation
export class BadRequest extends FormRequest {
  get schema() {
    return z.object({
      name: z.string(),
      // Dynamic fields based on runtime conditions
      ...(someCondition ? { extra: z.string() } : {})
    })
  }
}

// ✅ Good: Static schema with optional fields
export class GoodRequest extends FormRequest {
  schema = z.object({
    name: z.string(),
    extra: z.string().optional()
  })
}
```

### Security Best Practices

#### 1. Input Sanitization
```typescript
export class SecureRequest extends FormRequest {
  schema = z.object({
    content: z.string().max(1000), // Limit length
    email: z.string().email().toLowerCase(), // Normalize
    url: z.string().url().refine(
      url => new URL(url).hostname === 'trusted-domain.com',
      'Only trusted domains allowed'
    )
  })
  
  transform(data: unknown): unknown {
    const d = data as Record<string, unknown>
    return {
      ...d,
      // Sanitize HTML content
      content: typeof d.content === 'string' 
        ? sanitizeHtml(d.content)
        : d.content
    }
  }
}
```

#### 2. Rate Limiting in Authorization
```typescript
export class RateLimitedRequest extends FormRequest {
  schema = z.object({ action: z.string() })
  
  async authorize(ctx: Context): Promise<boolean> {
    const userId = ctx.get('user')?.id
    if (!userId) return false
    
    // Check rate limit
    const remaining = await rateLimit.check(userId)
    if (remaining <= 0) {
      return false
    }
    
    return true
  }
}
```

### Testing Best Practices

#### 1. Test Data Factories
```typescript
// tests/factories/requestData.ts
export const createUserData = {
  valid: () => ({
    name: 'John Doe',
    email: 'john@example.com'
  }),
  
  invalid: () => ({
    name: '', // Too short
    email: 'invalid-email'
  })
}

// tests/requests/CreateUserRequest.test.ts
describe('CreateUserRequest', () => {
  it('should validate correct data', async () => {
    const request = new CreateUserRequest()
    const result = await request.validate(
      createMockContext(createUserData.valid())
    )
    
    expect(result.success).toBe(true)
  })
})
```
```

### 6. Troubleshooting Guide

#### Common Issues and Solutions
```markdown
## Troubleshooting

### Common Issues

#### 1. "Cannot find module '@gravito/impulse'"

**Cause**: Missing dependency or incorrect import

**Solution**:
```bash
bun add @gravito/impulse
```

```typescript
// Correct import
import { FormRequest, z } from '@gravito/impulse'
```

#### 2. "Schema validation not working"

**Cause**: Schema not defined correctly

**Solution**:
```typescript
// ❌ Wrong: method instead of property
class WrongRequest extends FormRequest {
  getSchema() {
    return z.object({ name: z.string() })
  }
}

// ✅ Correct: property
class CorrectRequest extends FormRequest {
  schema = z.object({ name: z.string() })
}
```

#### 3. "Type error: Property 'validated' does not exist"

**Cause**: TypeScript doesn't know about validated data

**Solution**:
```typescript
// Add module augmentation
declare module '@gravito/core' {
  interface GravitoVariables {
    validated?: YourDataType
  }
}
```

#### 4. "Authorization always fails"

**Cause**: Async authorization not properly awaited

**Solution**:
```typescript
// ❌ Wrong: not awaited
class WrongAuth extends FormRequest {
  authorize(ctx: Context) {
    return checkUserPermissions(ctx.get('user'))  // Returns Promise<boolean>
  }
}

// ✅ Correct: properly async
class CorrectAuth extends FormRequest {
  async authorize(ctx: Context): Promise<boolean> {
    return await checkUserPermissions(ctx.get('user'))
  }
}
```

### Debug Mode

Enable debug logging:

```typescript
process.env.IMPULSE_DEBUG = 'true'

// Logs will show:
// [Impulse] Schema detection: zod
// [Impulse] Validation result: success
// [Impulse] Authorization: passed
```

### Performance Issues

#### Slow Validation

1. **Check schema complexity**: Simplify nested objects
2. **Enable caching**: Ensure instances are reused
3. **Profile validation**: Use performance profiler

```typescript
// Add timing
const start = performance.now()
const result = await request.validate(ctx)
console.log(`Validation took: ${performance.now() - start}ms`)
```
```

## Documentation Generation

### 1. API Documentation Generation
```typescript
// docs/scripts/generateApiDocs.ts
import { generateDocs } from 'typedoc'
import path from 'path'

const config = {
  entryPoints: ['src/index.ts'],
  out: 'docs/api',
  readme: 'README.md',
  includeVersion: true,
  excludeInternal: true,
  categorizeByGroup: true,
  categoryOrder: [
    'Classes',
    'Interfaces', 
    'Type Aliases',
    'Functions'
  ]
}

generateDocs(config)
```

### 2. Interactive Examples
```markdown
## Interactive Documentation

Use CodeSandbox/StackBlitz for live examples:

### Basic Form Request
[![Open in CodeSandbox](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/gravito-impulse-basic-example)

### Advanced Validation
[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/gravito-framework/gravito/tree/main/examples/impulse-advanced)
```

### 3. Documentation Structure
```
docs/
├── README.md              # Overview and quick start
├── api/                   # Generated API docs
├── guides/
│   ├── getting-started.md
│   ├── advanced-usage.md
│   ├── integration.md
│   └── best-practices.md
├── examples/
│   ├── basic-validation.md
│   ├── file-uploads.md
│   ├── authorization.md
│   └── custom-messages.md
├── migration/
│   ├── v0-to-v1.md
│   └── breaking-changes.md
└── troubleshooting/
    ├── common-issues.md
    └── debugging.md
```

## Implementation Tasks

### Task 5.1: JSDoc Enhancement
- [ ] Add comprehensive JSDoc to all public APIs
- [ ] Include usage examples in documentation
- [ ] Add `@since` tags for version tracking
- [ ] Document all parameter types and return values

### Task 5.2: Usage Guide Creation
- [ ] Write getting started guide
- [ ] Create advanced usage examples
- [ ] Document all data source types
- [ ] Add integration examples for popular frameworks

### Task 5.3: API Reference Generation
- [ ] Set up TypeDoc for API documentation
- [ ] Configure documentation themes
- [ ] Generate comprehensive API reference
- [ ] Set up automated documentation updates

### Task 5.4: Best Practices Guide
- [ ] Document performance best practices
- [ ] Create security guidelines
- [ ] Write testing recommendations
- [ ] Add code style guidelines

### Task 5.5: Troubleshooting Documentation
- [ ] Document common issues and solutions
- [ ] Create debugging guide
- [ ] Add performance troubleshooting
- [ ] Document migration scenarios

### Task 5.6: Interactive Examples
- [ ] Create CodeSandbox templates
- [ ] Set up StackBlitz examples
- [ ] Add runnable code examples
- [ ] Integrate with documentation site

## Success Criteria

- [ ] **100% public API coverage** in JSDoc
- [ ] **Comprehensive usage guide** with 20+ examples
- [ ] **Generated API reference** with TypeDoc
- [ ] **Migration guide** from previous versions
- [ ] **Best practices** documentation
- [ ] **Troubleshooting guide** covering common issues
- [ ] **Interactive examples** in CodeSandbox/StackBlitz
- [ ] **Multi-language support** (English + Chinese)

## Quality Metrics

### Documentation Quality
- [ ] All public APIs have JSDoc comments
- [ ] All examples are tested and working
- [ ] Documentation is spell-checked and grammar-checked
- [ ] Code examples follow project conventions

### User Experience
- [ ] Quick start guide gets users productive in < 5 minutes
- [ ] Advanced examples cover real-world use cases
- [ ] Troubleshooting guide resolves 80%+ of common issues
- [ ] Migration guide has zero breaking changes undocumented

### Maintenance
- [ ] Documentation is auto-generated where possible
- [ ] Examples are automatically tested in CI
- [ ] Documentation versioning matches package versions
- [ ] Links are automatically checked for validity

---

## Summary

This comprehensive optimization plan addresses all aspects of the `@gravito/impulse` package:

1. **Phase 1**: Modular architecture for maintainability
2. **Phase 2**: Type safety for excellent DX
3. **Phase 3**: Performance optimizations for scalability
4. **Phase 4**: Comprehensive testing for reliability
5. **Phase 5**: Professional documentation for adoption

Upon completion, `@gravito/impulse` will be a best-in-class validation library with enterprise-grade quality, performance, and developer experience.