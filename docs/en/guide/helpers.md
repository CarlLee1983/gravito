---
title: Helpers
description: Learn about Gravito's Arr, Str, and data path utilities.
---

# Helpers

> Gravito provides a set of high-performance utility functions to help you handle strings, arrays, and object paths.

## String Utilities (Str)

`Str` provides a rich set of methods for string manipulation.

```typescript
import { Str } from '@gravito/core'

// Convert to snake_case
Str.snake('FooBar') // 'foo_bar'

// Convert to kebab-case
Str.kebab('FooBar') // 'foo-bar'

// Convert to StudlyCase
Str.studly('foo_bar') // 'FooBar'

// Convert to camelCase
Str.camel('foo_bar') // 'fooBar'

// Limit string length
Str.limit('The quick brown fox', 10) // 'The quick...'

// Generate random string
Str.random(16)

// Generate UUID
Str.uuid()
```

## Array Utilities (Arr)

`Arr` provides a set of methods for handling plain arrays and arrays of objects.

```typescript
import { Arr } from '@gravito/core'

// Get nested property
const user = { name: { first: 'Alice' } }
Arr.get(user, 'name.first') // 'Alice'

// Check if path exists
Arr.has(user, 'name.last') // false

// Set nested property
Arr.set(user, 'profile.age', 25)

// Pluck specific fields
const users = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }]
Arr.pluck(users, 'name', 'id') // { '1': 'A', '2': 'B' }

// Exclude properties
Arr.except({ a: 1, b: 2, c: 3 }, ['a', 'c']) // { b: 2 }
```

## Data Path Utilities (dataGet / dataSet)

Low-level path resolution utilities supporting dot notation (`.`) access.

```typescript
import { dataGet, dataSet } from '@gravito/core'

const data = { posts: [{ title: 'Hello' }] }
const title = dataGet(data, 'posts.0.title') // 'Hello'
```

---

## Next Steps
Learn about [Error Handling](./errors.md).
