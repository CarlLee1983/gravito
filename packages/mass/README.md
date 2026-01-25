# @gravito/mass

TypeBox-based validation for Gravito. High-performance schema validation with full TypeScript support.

## Features

- **Fast validation**: TypeBox-powered validators with strong runtime performance
- **Full TypeScript support**: Type inference without manual typings
- **Photon integration**: Works seamlessly with Photon validation middleware
- **Multiple sources**: Validate JSON, query, params, and form data
- **Custom error handling**: Override default error responses with hooks
- **Schema utilities**: Helper functions for common schema transformations

## Installation

```bash
bun add @gravito/mass
```

## Quick Start

### JSON validation

```typescript
import { Photon } from '@gravito/photon'
import { Schema, validate } from '@gravito/mass'

const app = new Photon()

app.post('/login',
  validate('json', Schema.Object({
    username: Schema.String(),
    password: Schema.String()
  })),
  (c) => {
    const { username } = c.req.valid('json')
    return c.json({ success: true, message: `Welcome ${username}` })
  }
)
```

### Query validation

```typescript
app.get('/search',
  validate('query', Schema.Object({
    q: Schema.String(),
    page: Schema.Optional(Schema.Number())
  })),
  (c) => {
    const { q, page } = c.req.valid('query')
    return c.json({ query: q, page: page ?? 1 })
  }
)
```

### Route param validation

```typescript
app.get('/users/:id',
  validate('param', Schema.Object({
    id: Schema.String({ pattern: '^[0-9]+$' })
  })),
  (c) => {
    const { id } = c.req.valid('param')
    return c.json({ userId: id })
  }
)
```

## Advanced Usage

### Custom Error Handling

Override the default validation error response:

```typescript
import { Schema, validate } from '@gravito/mass'

const schema = Schema.Object({
  email: Schema.String({ format: 'email' }),
  age: Schema.Number({ minimum: 18 })
})

app.post('/register',
  validate('json', schema, (result, c) => {
    return c.json({
      error: 'VALIDATION_FAILED',
      message: 'Please check your input',
      details: result
    }, 422)
  }),
  (c) => {
    const data = c.req.valid('json')
    return c.json({ success: true, data })
  }
)
```

### Using Error Utilities

```typescript
import { MassValidationError, formatErrors } from '@gravito/mass'

app.post('/data',
  validate('json', mySchema, (result, c) => {
    const formatted = formatErrors(result.errors || [])
    return c.json(formatted, 400)
  }),
  handler
)
```

### Schema Utilities

Create partial schemas for PATCH endpoints:

```typescript
import { Schema, partial } from '@gravito/mass'

const userSchema = Schema.Object({
  name: Schema.String(),
  email: Schema.String(),
  age: Schema.Number()
})

const updateSchema = partial(userSchema)

app.patch('/users/:id',
  validate('json', updateSchema),
  (c) => {
    const updates = c.req.valid('json')
    return c.json({ updated: updates })
  }
)
```

## Schema Builder

`Schema` exposes TypeBox constructors:

```typescript
import { Schema } from '@gravito/mass'

Schema.String()
Schema.Number()
Schema.Boolean()
Schema.Array(Schema.String())

Schema.Object({
  name: Schema.String(),
  age: Schema.Number()
})

Schema.Optional(Schema.String())
Schema.String({ default: 'hello' })
Schema.String({ minLength: 2, maxLength: 100 })
Schema.Number({ minimum: 0, maximum: 100 })
Schema.String({ format: 'email' })
```

## Architecture

Mass follows the Galaxy Architecture principles:

- **Validation Layer**: Integrates with Photon middleware pipeline
- **Type Safety**: Full TypeScript inference from schema to validated data
- **Performance**: Zero-overhead validation using TypeBox
- **Extensibility**: Custom hooks for error handling and formatting

## Error Handling

### Default Behavior

By default, validation failures return a 400 response with error details:

```json
{
  "success": false,
  "errors": [
    {
      "path": "/email",
      "message": "Expected string to match 'email' format"
    }
  ]
}
```

### Custom Error Responses

Use the hook parameter to customize error responses:

```typescript
validate('json', schema, (result, c) => {
  if (!result.success) {
    return c.json({
      code: 'INVALID_INPUT',
      fields: result.errors
    }, 422)
  }
})
```

## Beam Client Integration

When you compose routes with `app.route()`, you get full type inference for the client:

```typescript
const app = new Photon()
const routes = app.route('/api/users', userRoute)

export type AppRoutes = typeof routes

const client = createBeam<AppRoutes>(baseUrl)
const result = await client.api.users.login.$post({
  json: { username: 'user', password: 'pass' }
})
```

## API Reference

### `validate(source, schema, hook?)`

Create a validation middleware.

- **source**: `'json' | 'query' | 'param' | 'form'` - Data source to validate
- **schema**: TypeBox schema - Expected data structure
- **hook**: Optional callback for custom error handling

### `Schema`

TypeBox schema builders (re-exported from `@sinclair/typebox`).

### `partial(schema)`

Create a schema with all fields optional.

### `MassValidationError`

Custom error class for validation failures.

### `formatErrors(errors)`

Format validation errors into a field-based structure.

## Performance Considerations

- TypeBox generates optimized validators at build-time
- Validation is faster than JSON Schema or Zod
- Minimal runtime overhead
- Full TypeScript type inference without reflection

## License

MIT
