---
title: MVC Development
description: Master the Model-View-Controller pattern in Gravito with enhanced developer experience.
---

# MVC Development

> Gravito provides a Laravel-inspired development experience for building structured Monolith applications using the MVC pattern, optimized for the speed of Bun.

## The Monolith Orbit

To enable advanced MVC features like base controllers and resource routing, ensure the `@gravito/monolith` orbit is installed and registered:

```typescript
import { OrbitMonolith } from '@gravito/monolith'

await core.orbit(new OrbitMonolith())
```

---

## Controllers

Controllers group related request handling logic into a single class.

### Generating Controllers
Use the Gravito CLI to generate a controller:

```bash
# Basic controller
gravito make:controller UserController

# Resource controller (with index, store, show, etc.)
gravito make:controller ProductController --resource
```

### Writing Logic
Inherit from the base `Controller` class to access helper methods:

```typescript
import { Controller } from '@gravito/monolith'

export class UserController extends Controller {
  async index() {
    // Access context variables
    const db = this.get('db')
    
    // Return typed JSON
    return this.json({
      users: await db.table('users').select()
    })
  }

  async show() {
    // Access route parameters via this.request
    const id = this.request.param('id')
    return this.text(`User ID: ${id}`)
  }
}
```

---

## Routing

Gravito supports explicit routing and automated resource mapping.

### Resource Routing
Register standard CRUD routes for a controller in one line:

```typescript
import { Route } from '@gravito/monolith'
import { UserController } from './controllers/UserController'

Route.resource(router, 'users', UserController)
```

This automatically maps the following:

| Verb | Path | Action | Route Name |
| :--- | :--- | :--- | :--- |
| GET | `/users` | index | `users.index` |
| GET | `/users/create` | create | `users.create` |
| POST | `/users` | store | `users.store` |
| GET | `/users/:id` | show | `users.show` |
| GET | `/users/:id/edit` | edit | `users.edit` |
| PUT | `/users/:id` | update | `users.update` |
| DELETE | `/users/:id` | destroy | `users.destroy` |

---

## Validation (Form Requests)

Form requests are custom request classes that encapsulate validation and authorization logic.

### Generating Requests
```bash
gravito make:request StoreUserRequest
```

### Defining Rules
Use `TypeBox` schemas to define your rules. Gravito will automatically clean your data (trimming strings, converting empty strings to null).

```typescript
import { FormRequest, Schema } from '@gravito/monolith'

export class StoreUserRequest extends FormRequest {
  schema() {
    return Schema.Object({
      email: Schema.String({ format: 'email' }),
      password: Schema.String({ minLength: 8 }),
      age: Schema.Number()
    })
  }

  authorize() {
    // Implement your permission logic here
    return true
  }
}
```

### Usage in Routes
Add the request middleware to your route. If validation fails, Gravito automatically returns a **422 Unprocessable Entity** response with formatted errors.

```typescript
router.post('/users', StoreUserRequest.middleware(), UserController.call('store'))
```

---

## Models (Atlas)

Models provide an Active Record implementation for database interactions.

### Generating Models with Links
Generate a model along with its migration and controller in one go:

```bash
gravito make:model Post -a
```

---

## Next Steps
Explore the [Database Guide](./orm-usage.md) to learn more about Atlas models and relationships.
