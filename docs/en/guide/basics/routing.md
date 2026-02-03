# Routing

Gravito router provides an elegant and fluent API for mapping URL requests to specific actions or controllers.

## Basic Routing

The most basic routes accept a URI and a closure:

```typescript
// src/routes/index.ts
export default function(routes: Router) {
  routes.get('/greeting', (c) => {
    return c.text('Hello World');
  });
}
```

### Available Router Methods

The router allows you to register routes that respond to any HTTP verb:

```typescript
routes.get(uri, handler);
routes.post(uri, handler);
routes.put(uri, handler);
routes.patch(uri, handler);
routes.delete(uri, handler);
```

## Route Parameters

### Required Parameters

Sometimes you will need to capture segments of the URI within your route. For example, you may need to capture a user's ID from the URL:

```typescript
routes.get('/user/:id', (c) => {
  const id = c.req.param('id');
  return c.text(`User ID: ${id}`);
});
```

You may define as many route parameters as required by your route:

```typescript
routes.get('/posts/:post/comments/:comment', (c) => {
  const { post, comment } = c.req.params();
  // ...
});
```

### Optional Parameters

To define an optional parameter, place a `?` mark after the parameter name:

```typescript
routes.get('/user/:name?', (c) => {
  const name = c.req.param('name') || 'Guest';
  return c.text(`Hello ${name}`);
});
```

## Named Routes

Named routes allow the convenient generation of URLs for specific routes. You may specify a name for a route by chaining the `name` method onto the route definition:

```typescript
routes.get('/user/profile', [UserController, 'show']).name('profile');
```

### Generating URLs to Named Routes

Once you have assigned a name to a given route, you may use the `c.route()` helper to generate URLs:

```typescript
// In a controller
const url = c.route('profile');

// Route with parameters
routes.get('/user/:id/profile', [UserController, 'show']).name('user.profile');

const urlWithParam = c.route('user.profile', { id: 1 }); 
// Output: /user/1/profile
```

## Route Groups

Route groups allow you to share route attributes, such as middleware or prefixes, across a large number of routes without needing to define those attributes on each individual route.

### Prefixes

The `prefix` method may be used to prefix each route in the group with a given URI:

```typescript
routes.prefix('/admin').group((group) => {
  group.get('/users', [AdminController, 'users']); // Matches /admin/users
});
```

### Middleware

To assign middleware to all routes within a group, you may use the `middleware` method:

```typescript
routes.middleware(auth()).group((group) => {
  group.get('/dashboard', [DashboardController, 'index']);
  group.get('/profile', [UserController, 'profile']);
});
```

### Subdomain Routing

Gravito routes can also handle subdomain constraints:

```typescript
routes.domain('api.example.com').group((group) => {
  group.get('/', () => {
    // Only triggered on api.example.com
  });
});
```

## Resource Routes

If you follow RESTful conventions, you can quickly define a set of routes using the `resource` method:

```typescript
routes.resource('photos', PhotoController);
```

This single line creates several routes to handle various actions on the resource:

| Verb | Action | URI | Method Name | Route Name |
| --- | --- | --- | --- | --- |
| GET | `index` | `/photos` | `index` | `photos.index` |
| GET | `create` | `/photos/create` | `create` | `photos.create` |
| POST | `store` | `/photos` | `store` | `photos.store` |
| GET | `show` | `/photos/:id` | `show` | `photos.show` |
| GET | `edit` | `/photos/:id/edit` | `edit` | `photos.edit` |
| PUT/PATCH | `update` | `/photos/:id` | `update` | `photos.update` |
| DELETE | `destroy` | `/photos/:id` | `destroy` | `photos.destroy` |

### Restricting Resource Routes

You may use the `only` or `except` options to restrict the actions generated:

```typescript
routes.resource('photos', PhotoController, {
  only: ['index', 'show']
});
```

## Route Model Binding

Gravito supports automatic injection of model instances into your routes.

### Explicit Binding

In your route definitions, use the `model` method to associate a parameter with a specific model class:

```typescript
import { User } from '../models/User';

export default function(routes: Router) {
  // Register binding
  routes.model('user', User);

  routes.get('/users/:user', (c) => {
    // Automatically fetches User from DB, throws 404 if not found
    const user = c.get('routeModels').user;
    return c.json(user);
  });
}
```

## Fallback Routes

When no other route matches the incoming request, you can define fallback logic (usually at the end of all route definitions):

```typescript
routes.get('*', (c) => {
  return c.notFound('Page Not Found');
});
```