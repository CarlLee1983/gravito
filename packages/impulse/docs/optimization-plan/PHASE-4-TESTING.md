# Phase 4: Testing & Coverage Improvements

> Achieve 90%+ test coverage and comprehensive test scenarios

## Overview

This phase focuses on improving test coverage from the current 70.92% to 90%+ while adding comprehensive test scenarios for edge cases, error conditions, and integration scenarios.

## Current Test Coverage Analysis

### Coverage Report (Baseline)
```
File                    | % Funcs | % Lines | Uncovered Line #s
------------------------|---------|---------|-------------------
src/FormRequest.ts     |   75.86 |   70.92 | 315,439-442,478-567
```

### Uncovered Code Analysis

#### Lines 315: Transform Data
```typescript
// Line 315 - Only tested in basic scenarios
if (this.transform) {
  data = this.transform(data)  // ❌ Not fully tested
}
```

#### Lines 439-442: Duck-typing for unknown schemas
```typescript
// Lines 439-442 - Fallback validation path
if (schemaAny.safeParse) {
  const r = schemaAny.safeParse(data)  // ❌ Not tested
  // Error path not covered
}
```

#### Lines 478-567: Blueprint Generation
```typescript
// Lines 478-567 - Entire getBlueprint() method
getBlueprint(): Record<string, any> {
  // Complex Zod schema parsing logic
  // parseZodField() method
  // ❌ Completely untested
}
```

### Test Gaps Identified

| Category | Current | Missing |
|----------|---------|---------|
| Data transformation | Basic | Complex transformations, error cases |
| Authorization | Happy path | Async authorization, error scenarios |
| Schema detection | Zod/Valibot | Unknown schemas, malformed schemas |
| Blueprint generation | None | Full Zod metadata extraction |
| Error message resolution | Basic | i18n edge cases, missing keys |
| Data source handling | JSON/Query | Form data, file uploads, malformed data |

## Testing Strategy

### 1. Unit Test Coverage Enhancement

#### Transform Method Testing
```typescript
describe('transform()', () => {
  it('should apply basic data transformation', () => {
    class TransformRequest extends FormRequest {
      schema = z.object({ name: z.string() })
      
      transform(data: unknown) {
        const d = data as { name?: string }
        return { name: d.name?.toUpperCase() }
      }
    }
    
    // Test transformation logic
  })
  
  it('should handle transform errors gracefully', () => {
    class ErrorTransformRequest extends FormRequest {
      schema = z.object({ value: z.number() })
      
      transform(data: unknown) {
        throw new Error('Transform failed')
      }
    }
    
    // Should not crash validation
  })
  
  it('should work with complex nested transformations', () => {
    class NestedTransformRequest extends FormRequest {
      schema = z.object({
        user: z.object({
          preferences: z.object({
            theme: z.enum(['light', 'dark'])
          })
        })
      })
      
      transform(data: unknown) {
        // Complex nested transformation
        return transformNestedObject(data)
      }
    }
  })
})
```

#### Authorization Testing
```typescript
describe('authorize()', () => {
  it('should handle async authorization', async () => {
    class AsyncAuthRequest extends FormRequest {
      schema = z.object({ data: z.string() })
      
      async authorize(ctx: Context): Promise<boolean> {
        // Simulate async auth check (DB, API call)
        await new Promise(resolve => setTimeout(resolve, 10))
        return ctx.get('user')?.role === 'admin'
      }
    }
    
    // Test async authorization flows
  })
  
  it('should handle authorization errors', async () => {
    class ErrorAuthRequest extends FormRequest {
      schema = z.object({ data: z.string() })
      
      authorize(ctx: Context): boolean {
        throw new Error('Auth service unavailable')
      }
    }
    
    // Should gracefully handle auth errors
  })
  
  it('should use custom authorization messages', async () => {
    class CustomAuthMsgRequest extends FormRequest {
      schema = z.object({ data: z.string() })
      
      authorize(): boolean { return false }
      authorizationMessage(): string {
        return 'Custom auth error message'
      }
    }
    
    // Test custom message propagation
  })
})
```

#### Schema Detection & Duck-typing
```typescript
describe('Schema Detection', () => {
  it('should handle unknown schema types gracefully', async () => {
    const unknownSchema = { 
      validate: (data: unknown) => ({ success: true, data })
    }
    
    class UnknownSchemaRequest extends FormRequest {
      schema = unknownSchema as any
    }
    
    // Should fallback gracefully
  })
  
  it('should handle malformed schemas', async () => {
    const malformedSchema = { 
      safeParse: 'not a function' 
    } as any
    
    class MalformedRequest extends FormRequest {
      schema = malformedSchema
    }
    
    // Should throw helpful error
  })
  
  it('should work with custom schema-like objects', async () => {
    const customSchema = {
      safeParse: (data: unknown) => ({
        success: true,
        data,
        error: undefined
      })
    }
    
    class CustomSchemaRequest extends FormRequest {
      schema = customSchema as any
    }
    
    // Should work via duck-typing
  })
})
```

#### Blueprint Generation Testing
```typescript
describe('getBlueprint()', () => {
  it('should extract basic Zod schema metadata', () => {
    class BasicRequest extends FormRequest {
      schema = z.object({
        name: z.string().min(2),
        email: z.string().email(),
        age: z.number().int().min(18).optional()
      })
    }
    
    const request = new BasicRequest()
    const blueprint = request.getBlueprint()
    
    expect(blueprint.rules.name).toEqual({
      type: 'string',
      required: true,
      min: 2
    })
    expect(blueprint.rules.email).toEqual({
      type: 'string',
      required: true,
      format: 'email'
    })
    expect(blueprint.rules.age).toEqual({
      type: 'number',
      required: false,
      integer: true,
      min: 18
    })
  })
  
  it('should handle complex Zod schemas', () => {
    class ComplexRequest extends FormRequest {
      schema = z.object({
        status: z.enum(['active', 'inactive']),
        tags: z.array(z.string()),
        metadata: z.record(z.unknown()),
        nested: z.object({
          value: z.number()
        }).nullable(),
        computed: z.string().default('default-value')
      })
    }
    
    const request = new ComplexRequest()
    const blueprint = request.getBlueprint()
    
    // Verify complex type extraction
    expect(blueprint.rules.status).toEqual({
      type: 'enum',
      required: true,
      options: ['active', 'inactive']
    })
    expect(blueprint.rules.tags).toEqual({
      type: 'array',
      required: true,
      items: { type: 'string', required: true }
    })
  })
  
  it('should return empty blueprint for non-Zod schemas', () => {
    class ValibotRequest extends FormRequest {
      schema = {} as any  // Mock Valibot schema
    }
    
    const request = new ValibotRequest()
    const blueprint = request.getBlueprint()
    
    expect(blueprint.rules).toEqual({})
  })
})
```

### 2. Data Source Testing

#### Form Data Testing
```typescript
describe('Form Data Handling', () => {
  it('should parse multipart form data', async () => {
    const formData = new FormData()
    formData.append('name', 'John')
    formData.append('file', new File(['content'], 'test.txt'))
    
    const mockRequest = new Request('http://test.com', {
      method: 'POST',
      body: formData
    })
    
    // Test form data extraction
  })
  
  it('should handle form data with arrays', async () => {
    const formData = new FormData()
    formData.append('tags[]', 'tag1')
    formData.append('tags[]', 'tag2')
    
    // Test array handling in form data
  })
  
  it('should handle malformed form data', async () => {
    // Test error resilience
  })
})
```

#### Query Parameter Edge Cases
```typescript
describe('Query Parameter Handling', () => {
  it('should handle encoded query parameters', async () => {
    const ctx = createMockContext('/?name=John%20Doe&email=john%2Btest%40example.com')
    
    class QueryRequest extends FormRequest {
      source = 'query' as const
      schema = z.object({
        name: z.string(),
        email: z.string().email()
      })
    }
    
    // Test URL decoding
  })
  
  it('should handle duplicate query parameters', async () => {
    const ctx = createMockContext('/?tag=red&tag=blue&tag=green')
    
    // Test array handling
  })
  
  it('should handle malformed query strings', async () => {
    const ctx = createMockContext('/?invalid=%%&malformed')
    
    // Test error resilience
  })
})
```

### 3. Error Scenario Testing

#### Validation Error Testing
```typescript
describe('Validation Errors', () => {
  it('should generate proper error details with field paths', async () => {
    class NestedRequest extends FormRequest {
      schema = z.object({
        user: z.object({
          profile: z.object({
            details: z.object({
              name: z.string().min(2)
            })
          })
        })
      })
    }
    
    const result = await validateWithInvalidData({
      user: { profile: { details: { name: 'A' } } }
    })
    
    expect(result.error.details[0].field).toBe('user.profile.details.name')
  })
  
  it('should handle multiple validation errors', async () => {
    class MultiErrorRequest extends FormRequest {
      schema = z.object({
        name: z.string().min(2),
        email: z.string().email(),
        age: z.number().min(18),
        phone: z.string().regex(/^\d{10}$/)
      })
    }
    
    const result = await validateWithInvalidData({
      name: 'A',           // Too short
      email: 'invalid',    // Invalid email
      age: 16,            // Too young
      phone: '123'        // Invalid format
    })
    
    expect(result.error.details).toHaveLength(4)
  })
})
```

#### Context Integration Testing
```typescript
describe('Context Integration', () => {
  it('should preserve context variables during validation', async () => {
    class ContextRequest extends FormRequest {
      schema = z.object({ data: z.string() })
      
      authorize(ctx: Context): boolean {
        return ctx.get('customVar') === 'expected'
      }
    }
    
    const ctx = createMockContext()
    ctx.set('customVar', 'expected')
    ctx.set('otherVar', 'should-remain')
    
    await validateRequest(ContextRequest)(ctx, mockNext)
    
    expect(ctx.get('otherVar')).toBe('should-remain')
    expect(ctx.get('validated')).toBeDefined()
  })
})
```

### 4. Integration Testing

#### Router Integration
```typescript
describe('Router Integration', () => {
  it('should work with Gravito core router detection', async () => {
    // Test FormRequest class detection by Router
    const router = new Router()
    
    class TestRequest extends FormRequest {
      schema = z.object({ test: z.string() })
    }
    
    // Test automatic middleware conversion
    const route = router.post('/test', TestRequest, mockHandler)
    expect(route.middlewares).toHaveLength(1)
  })
  
  it('should work with route groups', async () => {
    const router = new Router()
    
    router.group('/api', () => {
      router.post('/users', CreateUserRequest, userHandler)
      router.put('/users/:id', UpdateUserRequest, updateHandler)
    })
    
    // Test middleware application in groups
  })
})
```

#### Error Handler Integration
```typescript
describe('Error Handler Integration', () => {
  it('should integrate with Gravito exception handling', async () => {
    const errorHandler = new ErrorHandler()
    
    const validationError = new ValidationException([
      { field: 'email', message: 'Invalid email', code: 'invalid_email' }
    ])
    
    const response = await errorHandler.handle(validationError, mockContext)
    
    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        details: [{ field: 'email', message: 'Invalid email' }]
      }
    })
  })
})
```

### 5. Performance Testing

#### Benchmark Integration
```typescript
describe('Performance Benchmarks', () => {
  it('should validate within performance thresholds', async () => {
    const request = new BenchmarkRequest()
    const ctx = createMockContext()
    
    const start = performance.now()
    await request.validate(ctx)
    const duration = performance.now() - start
    
    expect(duration).toBeLessThan(5) // 5ms threshold
  })
  
  it('should handle concurrent validations', async () => {
    const promises = Array.from({ length: 100 }, () => 
      validateConcurrentRequest(createMockContext())
    )
    
    const start = performance.now()
    await Promise.all(promises)
    const duration = performance.now() - start
    
    expect(duration).toBeLessThan(100) // 100ms for 100 concurrent
  })
})
```

### 6. Valibot Schema Testing

#### Valibot Integration
```typescript
describe('Valibot Integration', () => {
  it('should work with Valibot v1+ _run method', async () => {
    const mockValibotSchema = {
      _run(dataset: { value: unknown }) {
        const data = dataset.value as { email?: string }
        if (!data.email?.includes('@')) {
          return {
            issues: [{
              path: [{ key: 'email' }],
              message: 'Invalid email',
              type: 'email'
            }]
          }
        }
        return { issues: [] }
      }
    }
    
    class ValibotRequest extends FormRequest {
      schema = mockValibotSchema as any
    }
    
    // Test validation with Valibot
  })
  
  it('should work with Valibot parse method (legacy)', async () => {
    const mockValibotSchema = {
      parse(data: unknown) {
        const d = data as { name?: string }
        if (!d.name || d.name.length < 2) {
          throw {
            issues: [{
              path: [{ key: 'name' }],
              message: 'Name too short',
              type: 'min_length'
            }]
          }
        }
        return data
      }
    }
    
    class ValibotParseRequest extends FormRequest {
      schema = mockValibotSchema as any
    }
    
    // Test legacy parse method
  })
})
```

## Test Infrastructure Improvements

### 1. Mock Framework Enhancement
```typescript
// tests/helpers/mockContext.ts
export function createMockContext(url = '/', options: ContextOptions = {}) {
  const request = new Request(`http://test.com${url}`, {
    method: options.method || 'GET',
    headers: options.headers || {},
    body: options.body
  })
  
  return new MockContext(request, options.variables || {})
}

export class MockContext implements Context {
  private variables = new Map()
  
  constructor(
    public req: Request,
    initialVariables: Record<string, unknown> = {}
  ) {
    Object.entries(initialVariables).forEach(([key, value]) => {
      this.variables.set(key, value)
    })
  }
  
  get<T>(key: string): T {
    return this.variables.get(key)
  }
  
  set(key: string, value: unknown): void {
    this.variables.set(key, value)
  }
  
  // ... implement other Context methods
}
```

### 2. Test Data Generators
```typescript
// tests/helpers/generators.ts
export const testDataGenerator = {
  validUser: () => ({
    name: 'John Doe',
    email: 'john@example.com',
    age: 25
  }),
  
  invalidUser: () => ({
    name: 'A',              // Too short
    email: 'invalid-email', // Invalid format
    age: 16                 // Too young
  }),
  
  formData: (data: Record<string, string | File>) => {
    const form = new FormData()
    Object.entries(data).forEach(([key, value]) => {
      form.append(key, value)
    })
    return form
  }
}
```

### 3. Assertion Helpers
```typescript
// tests/helpers/assertions.ts
export function expectValidationError(
  result: ValidationResult,
  field: string,
  code?: string
) {
  expect(result.success).toBe(false)
  if (!result.success) {
    const error = result.error.details.find(d => d.field === field)
    expect(error).toBeDefined()
    if (code) {
      expect(error?.code).toBe(code)
    }
  }
}

export function expectValidationSuccess<T>(
  result: ValidationResult<T>
): asserts result is { success: true; data: T } {
  expect(result.success).toBe(true)
  expect(result.data).toBeDefined()
}
```

## Coverage Targets

### File-level Coverage Goals
| File | Current | Target | Priority |
|------|---------|--------|----------|
| `FormRequest.ts` | 70.92% | 95% | High |
| `validateRequest` helper | ~80% | 95% | High |
| Type guards | ~60% | 90% | Medium |

### Feature Coverage Goals
| Feature | Current | Target |
|---------|---------|--------|
| Schema validation | 90% | 98% |
| Data extraction | 70% | 95% |
| Error handling | 80% | 95% |
| Authorization | 60% | 90% |
| Blueprint generation | 0% | 85% |
| Transform functions | 30% | 90% |

## Test Execution Strategy

### 1. Test Categories
```bash
# Unit tests (fast)
bun test --grep "Unit:"

# Integration tests (slower) 
bun test --grep "Integration:"

# Performance tests (on-demand)
bun test --grep "Performance:" --timeout 30000

# All tests with coverage
bun test --coverage --coverage-threshold=90
```

### 2. CI Integration
```yaml
# .github/workflows/test.yml
- name: Run Tests with Coverage
  run: |
    bun test --coverage --coverage-threshold=90
    bun run test:performance
    bun run test:integration
```

### 3. Coverage Reporting
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90
      },
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.bench.ts'
      ]
    }
  }
})
```

## Implementation Plan

### Task 4.1: Unit Test Coverage
- [ ] Add transform method testing (covers lines ~315)
- [ ] Add authorization edge cases
- [ ] Add schema detection for unknown types (covers lines 439-442)
- [ ] Complete blueprint generation testing (covers lines 478-567)

### Task 4.2: Integration Testing
- [ ] Router integration tests
- [ ] Error handler integration
- [ ] Context variable preservation
- [ ] Middleware ordering

### Task 4.3: Data Source Testing  
- [ ] Form data with file uploads
- [ ] Query parameter edge cases
- [ ] Route parameter validation
- [ ] Malformed data handling

### Task 4.4: Performance Testing
- [ ] Validation benchmarks
- [ ] Memory usage tests
- [ ] Concurrent request handling
- [ ] Load testing scenarios

### Task 4.5: Test Infrastructure
- [ ] Enhanced mock framework
- [ ] Test data generators
- [ ] Assertion helpers
- [ ] Coverage reporting improvements

## Success Criteria

- [ ] **95%+ line coverage** on FormRequest.ts
- [ ] **90%+ branch coverage** on all validation paths
- [ ] **Zero uncovered critical paths** (error handling, security)
- [ ] **Comprehensive edge case testing** for all data sources
- [ ] **Performance benchmarks** integrated into CI
- [ ] **Integration tests** cover all framework touchpoints

---

**Next**: [Phase 5: Documentation & API Enhancement](./PHASE-5-DOCUMENTATION.md)