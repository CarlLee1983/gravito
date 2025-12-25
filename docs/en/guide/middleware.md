# Middleware

Middleware provides a convenient mechanism for inspecting and filtering HTTP requests entering your application. For example, Gravito includes middleware that verifies the user of your application is authenticated.

## Defining Middleware

A middleware is a function that receives the `Context` and a `next` function.

```typescript
import { GravitoMiddleware } from 'gravito-core';

export const logger: GravitoMiddleware = async (c, next) => {
  const start = Date.now();
  
  // Execute the next handler in the chain
  await next();
  
  const ms = Date.now() - start;
  console.log(`${c.req.method} ${c.req.path} - ${ms}ms`);
};
```

## Registering Middleware

### Assigning to Routes

You may assign middleware to specific routes:

```typescript
routes.get('/profile', logger, [UserController, 'profile']);
```

### Grouping Middleware

You may also assign middleware to a group of routes:

```typescript
routes.middleware(logger).group((group) => {
  group.get('/', [HomeController, 'index']);
  group.get('/about', [HomeController, 'about']);
});
```

### Global Middleware

If you want a middleware to run during every HTTP request to your application, use `adapter.useGlobal` during `PlanetCore` initialization:

```typescript
// src/bootstrap.ts
core.adapter.useGlobal(logger);
```

## Middleware Parameters

Middleware can also receive additional parameters. This is typically achieved by creating a factory function that returns the middleware:

```typescript
export function restrictTo(role: string): GravitoMiddleware {
  return async (c, next) => {
    const user = c.get('user');
    
    if (user?.role !== role) {
      return c.forbidden('Access denied');
    }
    
    await next();
  };
}

// Usage
routes.get('/admin', restrictTo('admin'), [AdminController, 'index']);
```
