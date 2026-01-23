# Phase 3: Performance Optimization

> Optimize validation performance and memory usage

## Overview

This phase focuses on improving runtime performance through caching, lazy loading, and optimization of hot paths. While FormRequest validation is not typically a bottleneck, optimization ensures scalability.

## Current Performance Analysis

### Benchmark Baseline
```typescript
// Current performance characteristics (estimated)
- Schema type detection: ~0.1ms per request
- Zod validation: ~0.5-2ms (depends on schema complexity)
- Valibot validation: ~0.3-1ms (generally faster than Zod)
- Error message resolution: ~0.1ms
- Data extraction: ~0.1-0.5ms
```

### Performance Bottlenecks Identified

#### 1. Schema Type Detection
```typescript
// Runs on every validation call
function isZodSchema(schema: unknown): schema is z.ZodType {
  return (
    schema !== null &&
    typeof schema === 'object' &&
    'safeParse' in schema &&
    typeof (schema as { safeParse: unknown }).safeParse === 'function'
  )
}
```

**Issues:**
- Type checking performed every time
- Object property lookups on each call
- No caching of detection results

#### 2. Validator Instance Creation
```typescript
// New instance created for each validation
const request = new RequestClass()
const result = await request.validate(ctx)
```

**Issues:**
- FormRequest instances not reused
- Schema parsing/compilation repeated
- Memory allocation on every request

#### 3. Error Message Resolution
```typescript
// Multiple lookups for each validation error
protected getErrorMessage(field: string, code: string, defaultMessage: string) {
  // 1. Custom messages lookup
  if (this.messages) {
    const customMessages = this.messages()  // Called every time
    // ...
  }
  // 2. MessageProvider lookup
  // 3. Default fallback
}
```

**Issues:**
- `messages()` called repeatedly
- No caching of message resolution
- Multiple function calls per error

## Optimization Strategies

### 1. Schema Type Detection Caching

#### Current Implementation
```typescript
function isZodSchema(schema: unknown): schema is z.ZodType {
  return /* type checking logic */
}
```

#### Optimized Implementation
```typescript
const schemaTypeCache = new WeakMap<object, 'zod' | 'valibot' | 'unknown'>()

function getSchemaType(schema: unknown): 'zod' | 'valibot' | 'unknown' {
  if (typeof schema !== 'object' || schema === null) {
    return 'unknown'
  }

  // Check cache first
  const cached = schemaTypeCache.get(schema)
  if (cached !== undefined) {
    return cached
  }

  // Perform detection
  let type: 'zod' | 'valibot' | 'unknown' = 'unknown'
  
  if ('safeParse' in schema && typeof schema.safeParse === 'function') {
    type = 'zod'
  } else if ('_run' in schema || ('parse' in schema && !('safeParse' in schema))) {
    type = 'valibot'
  }

  // Cache result
  schemaTypeCache.set(schema, type)
  return type
}
```

**Benefits:**
- **75%+ reduction** in type detection time for repeated schemas
- WeakMap ensures no memory leaks
- One-time detection per schema object

### 2. FormRequest Instance Caching

#### Current Implementation
```typescript
function formRequestToMiddleware(RequestClass: FormRequestClass): GravitoMiddleware {
  return async (ctx, next) => {
    const request = new RequestClass()  // New instance every time
    const result = await request.validate(ctx)
    // ...
  }
}
```

#### Optimized Implementation
```typescript
const formRequestInstances = new WeakMap<FormRequestClass, FormRequest>()

function formRequestToMiddleware(RequestClass: FormRequestClass): GravitoMiddleware {
  return async (ctx, next) => {
    // Reuse singleton instance
    let request = formRequestInstances.get(RequestClass)
    if (!request) {
      request = new RequestClass()
      formRequestInstances.set(RequestClass, request)
    }
    
    const result = await request.validate(ctx)
    // ...
  }
}
```

**Benefits:**
- **Eliminates object allocation** on hot path
- **Reduces GC pressure** significantly
- **Faster validation** due to potential JIT optimizations

### 3. Message Resolution Caching

#### Current Implementation
```typescript
protected getErrorMessage(field: string, code: string, defaultMessage: string): string {
  if (this.messages) {
    const customMessages = this.messages()  // Called every time
    const key = code ? `${field}.${code}` : field
    if (customMessages[key]) {
      return customMessages[key]
    }
  }
  // ...
}
```

#### Optimized Implementation
```typescript
const messageCache = new Map<FormRequestClass, Record<string, string>>()

protected getErrorMessage(field: string, code: string, defaultMessage: string): string {
  // Cache messages per FormRequest class
  let customMessages = messageCache.get(this.constructor as FormRequestClass)
  if (!customMessages && this.messages) {
    customMessages = this.messages()
    messageCache.set(this.constructor as FormRequestClass, customMessages)
  }

  if (customMessages) {
    const key = code ? `${field}.${code}` : field
    if (customMessages[key]) {
      return customMessages[key]
    }
  }
  // ...
}
```

**Benefits:**
- **Eliminates repeated** `messages()` calls
- **Faster message lookup** via pre-computed cache
- **Consistent performance** regardless of error count

### 4. Schema Compilation Optimization

#### Zod Schema Caching
```typescript
const zodSchemaCache = new WeakMap<ZodSchema, {
  safeParse: (data: unknown) => SafeParseResult<unknown>
}>()

function validateWithZod(schema: ZodSchema, data: unknown): SchemaValidationResult {
  // Use cached compiled schema if available
  let compiledSchema = zodSchemaCache.get(schema)
  if (!compiledSchema) {
    // Pre-compile and cache
    compiledSchema = {
      safeParse: schema.safeParse.bind(schema)
    }
    zodSchemaCache.set(schema, compiledSchema)
  }
  
  const result = compiledSchema.safeParse(data)
  // ...
}
```

#### Valibot Schema Caching
```typescript
const valibotSchemaCache = new WeakMap<ValibotSchema, {
  validateSync: (data: unknown) => SchemaValidationResult
}>()
```

### 5. Data Extraction Optimization

#### JSON Parsing Optimization
```typescript
// Current implementation
async getData(ctx: Context): Promise<unknown> {
  switch (this.source) {
    case 'json':
      return ctx.req.json().catch(() => ({}))  // Always parses
    // ...
  }
}
```

#### Optimized Implementation
```typescript
async getData(ctx: Context): Promise<unknown> {
  switch (this.source) {
    case 'json':
      // Check Content-Type before parsing
      const contentType = ctx.req.header('content-type')
      if (!contentType?.includes('application/json')) {
        return {}
      }
      
      // Cache parsed body in context
      const cached = ctx.get('__parsedBody')
      if (cached !== undefined) {
        return cached
      }
      
      const body = await ctx.req.json().catch(() => ({}))
      ctx.set('__parsedBody', body)
      return body
    // ...
  }
}
```

**Benefits:**
- **Avoids unnecessary JSON parsing** for non-JSON requests
- **Prevents duplicate parsing** when multiple FormRequests used
- **Faster execution** for form data and query parameter requests

### 6. Memory Pool for Common Objects

#### Error Object Pooling
```typescript
class ValidationErrorPool {
  private pool: ValidationErrorDetail[] = []
  private inUse = new Set<ValidationErrorDetail>()

  acquire(field: string, message: string, code?: string): ValidationErrorDetail {
    let error = this.pool.pop()
    if (!error) {
      error = { field: '', message: '', code: undefined }
    }
    
    error.field = field
    error.message = message
    error.code = code
    
    this.inUse.add(error)
    return error
  }

  release(error: ValidationErrorDetail): void {
    if (this.inUse.has(error)) {
      this.inUse.delete(error)
      this.pool.push(error)
    }
  }
}
```

### 7. Benchmark Suite Implementation

#### Performance Testing Framework
```typescript
// src/benchmarks/validation.bench.ts
import { Bench } from 'tinybench'

const bench = new Bench({ time: 1000, iterations: 1000 })

bench
  .add('Zod validation (cached)', () => {
    return validateZodSchemaWithCaching(sampleSchema, sampleData)
  })
  .add('Zod validation (uncached)', () => {
    return validateZodSchemaWithoutCaching(sampleSchema, sampleData)
  })
  .add('Valibot validation (cached)', () => {
    return validateValibotSchemaWithCaching(sampleSchema, sampleData)
  })

await bench.run()
console.table(bench.table())
```

#### Memory Usage Monitoring
```typescript
// src/benchmarks/memory.bench.ts
function measureMemoryUsage(fn: () => void, iterations: number): number {
  const startMemory = process.memoryUsage().heapUsed
  
  for (let i = 0; i < iterations; i++) {
    fn()
  }
  
  // Force GC if available
  if (global.gc) {
    global.gc()
  }
  
  return process.memoryUsage().heapUsed - startMemory
}
```

## Performance Targets

### Benchmark Goals
| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Cold validation | ~2ms | ~1.5ms | 25% faster |
| Warm validation | ~2ms | ~0.5ms | 75% faster |
| Memory per request | ~50KB | ~10KB | 80% less |
| Type detection | ~0.1ms | ~0.01ms | 90% faster |

### Load Testing Targets
```typescript
// Target performance under load
- 10,000 req/s: < 1ms p95 validation latency
- 50,000 req/s: < 2ms p95 validation latency
- Memory growth: < 10MB/hour under sustained load
```

## Implementation Plan

### Task 3.1: Schema Type Detection Cache
- [ ] Implement `WeakMap` based caching
- [ ] Add benchmarks for type detection
- [ ] Measure memory impact

### Task 3.2: FormRequest Instance Caching
- [ ] Update middleware factory with instance caching
- [ ] Ensure thread safety (singleton pattern)
- [ ] Test with concurrent requests

### Task 3.3: Message Resolution Cache
- [ ] Cache `messages()` results per class
- [ ] Implement cache invalidation strategy
- [ ] Benchmark message resolution performance

### Task 3.4: Schema Compilation Optimization
- [ ] Add Zod schema compilation caching
- [ ] Add Valibot schema compilation caching
- [ ] Benchmark validation performance

### Task 3.5: Data Extraction Optimization
- [ ] Implement body parsing cache
- [ ] Add Content-Type validation
- [ ] Optimize query parameter parsing

### Task 3.6: Benchmark Infrastructure
- [ ] Create comprehensive benchmark suite
- [ ] Add memory usage monitoring
- [ ] Set up performance regression testing

## Testing Strategy

### Performance Tests
```typescript
describe('Performance Optimizations', () => {
  it('should cache schema type detection', async () => {
    const schema = z.string()
    const start = performance.now()
    
    // First call (uncached)
    getSchemaType(schema)
    const firstCall = performance.now() - start
    
    // Second call (cached)
    const start2 = performance.now()
    getSchemaType(schema)
    const secondCall = performance.now() - start2
    
    expect(secondCall).toBeLessThan(firstCall * 0.5)
  })

  it('should reuse FormRequest instances', async () => {
    const middleware = formRequestToMiddleware(TestRequest)
    
    const memory1 = process.memoryUsage().heapUsed
    await middleware(mockContext, mockNext)
    await middleware(mockContext, mockNext)
    const memory2 = process.memoryUsage().heapUsed
    
    expect(memory2 - memory1).toBeLessThan(1000) // < 1KB growth
  })
})
```

### Load Testing
```typescript
// Load test with autocannon or similar
const loadTest = {
  connections: 100,
  duration: 30, // seconds
  requests: [
    { method: 'POST', path: '/validate', body: sampleData }
  ]
}
```

## Monitoring and Metrics

### Runtime Performance Metrics
```typescript
// Performance monitoring hooks
core.hooks.addAction('validation:start', (ctx) => {
  ctx.set('validationStartTime', performance.now())
})

core.hooks.addAction('validation:end', (ctx) => {
  const duration = performance.now() - ctx.get('validationStartTime')
  metrics.histogram('validation_duration_ms', duration)
})
```

### Memory Monitoring
```typescript
// Memory usage tracking
setInterval(() => {
  const usage = process.memoryUsage()
  metrics.gauge('heap_used_bytes', usage.heapUsed)
  metrics.gauge('cache_size', schemaTypeCache.size)
}, 5000)
```

## Success Criteria

- [ ] **75%+ reduction** in warm-path validation time
- [ ] **80%+ reduction** in memory allocation per request
- [ ] **90%+ reduction** in schema type detection time
- [ ] **Zero performance regression** on any existing functionality
- [ ] **Comprehensive benchmark suite** with CI integration
- [ ] **Memory leak testing** passes 24-hour sustained load

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Memory leaks from caching | Use WeakMap for automatic cleanup |
| Cache invalidation bugs | Comprehensive integration tests |
| Performance regression | Benchmark every change |
| Cache coherence issues | Immutable data structures where possible |

---

**Next**: [Phase 4: Testing & Coverage](./PHASE-4-TESTING.md)