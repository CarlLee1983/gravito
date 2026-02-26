# Validation Strategy Guide

Validation is the first line of defense in the **Gravito Sensing Layer**. This guide details how to implement a robust validation strategy across your application.

## 1. Multi-Source Validation

A single route can validate multiple sources (JSON body, Query strings, URL params) simultaneously.

```typescript
app.get('/products/:category',
  validate('param', Schema.Object({ category: Schema.String() })),
  validate('query', Schema.Object({ page: Schema.Number({ default: 1 }) })),
  async (c) => {
    const { category } = c.req.valid('param')
    const { page } = c.req.valid('query')
    // ...
  }
)
```

## 2. Binary (CBOR) Validation

In high-performance scenarios, use **CBOR** instead of JSON. `@gravito/mass` handles binary validation with the same API.

```typescript
import { validate } from '@gravito/mass'

// Photon automatically detects CBOR if the 'Content-Type: application/cbor' header is present
app.post('/sensor-data', 
  validate('json', SensorDataSchema), 
  (c) => {
    const data = c.req.valid('json') // De-serialized and validated!
    return c.body(null, 204)
  }
)
```

## 3. Custom Validation Hooks

Use hooks to perform complex cross-field validation or to customize the error response format.

```typescript
app.post('/settings',
  validate('json', SettingsSchema, (result, c) => {
    if (!result.success) {
      // Custom error format for your frontend
      return c.json({
        status: 'error',
        errors: result.errors.map(e => e.message)
      }, 422)
    }
    
    // Cross-field validation example
    const data = result.value
    if (data.min > data.max) {
      return c.json({ error: 'Min cannot be greater than Max' }, 422)
    }
  }),
  (c) => { ... }
)
```

## 4. Performance Tuning

`@gravito/mass` is designed for speed. To ensure maximum performance:

- **Pre-compile Schemas**: In a production environment, `mass` pre-compiles schemas into high-performance JavaScript functions.
- **Avoid Over-validation**: Only validate fields you actually use in your business logic.
- **Use `partial()` correctly**: Be careful with deep nesting in partial schemas as it can increase validation complexity.

## 5. Middleware Order

Always place `validate` middleware **after** authentication but **before** business logic.

```typescript
app.use('/api/*', auth()) // 1. Identify User
app.use('/api/*', validate('json', schema)) // 2. Verify Data Quality
app.post('/api/action', handler) // 3. Execute Business Logic
```
