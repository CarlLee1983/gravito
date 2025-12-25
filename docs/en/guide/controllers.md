# Controllers

Instead of defining all of your request handling logic as closures in your route files, you may wish to organize this behavior using controller classes.

## Basic Controllers

Controllers are stored in the `src/controllers` directory. A basic controller structure looks like this:

```typescript
import { GravitoContext as Context } from 'gravito-core';

export class UserController {
  /**
   * Show the profile for a given user.
   */
  async show(c: Context) {
    const id = c.req.param('id');
    const user = await User.find(id);

    return c.json({ user });
  }
}
```

### Controllers & Dependency Injection

Gravito controllers can access any service from the application container via the `Context`:

```typescript
async list({ userService }: Context) {
  // userService is automatically injected via Proxy
  const users = await userService.all();
  return c.json(users);
}
```

## Single Action Controllers

If you would like to define a controller that only handles a single action, you may define a single method and point to it in your route:

```typescript
export class ProvisionServerController {
  async handle(c: Context) {
    // Logic
  }
}

// Route definition
routes.get('/server/provision', [ProvisionServerController, 'handle']);
```

## Resource Controllers

Gravito resource routing makes it easy to create RESTful controllers. When used with `routes.resource()`, your controller should include the corresponding methods:

```typescript
export class PhotoController {
  // GET /photos
  async index(c: Context) { /* ... */ }

  // GET /photos/create
  async create(c: Context) { /* ... */ }

  // POST /photos
  async store(c: Context) { /* ... */ }

  // GET /photos/:id
  async show(c: Context) { /* ... */ }

  // GET /photos/:id/edit
  async edit(c: Context) { /* ... */ }

  // PUT /photos/:id
  async update(c: Context) { /* ... */ }

  // DELETE /photos/:id
  async destroy(c: Context) { /* ... */ }
}
```
