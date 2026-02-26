---
title: Routing Basics
description: Master the Gravito router. Learn about basic routing, parameters, named routes, and declarative routing via manifest.json.
---

# 🚦 Routing

The Gravito router provides an elegant and fluent API for mapping URL requests to specific actions or controllers. It is built on top of Photon's O(1) Radix Tree engine for extreme performance.

---

## 🏗️ Basic Routing

The most basic routes accept a URI and a closure or a controller method:

```typescript
// Simple closure
router.get('/greeting', (c) => {
  return c.text('Hello World');
});

// Controller method
router.get('/profile', [UserController, 'show']);
```

### Available Methods

The router supports all standard HTTP verbs:

```typescript
router.get(uri, handler);
router.post(uri, handler);
router.put(uri, handler);
router.patch(uri, handler);
router.delete(uri, handler);
router.options(uri, handler);
```

---

## 📄 Declarative Routing (Manifest-Driven)

In the **Galaxy Architecture**, we recommend defining routes declaratively inside a Satellite's `manifest.json`. This allows for zero-config discovery and parallel loading.

```json
{
  "name": "UserSatellite",
  "routes": [
    { 
      "path": "/profile", 
      "method": "GET", 
      "handler": "UserController@show",
      "middleware": ["auth"]
    },
    { 
      "path": "/settings", 
      "method": "POST", 
      "handler": "UserController@update" 
    }
  ]
}
```

> **Note**: To use string-based handlers like `"UserController@show"`, you must register the class or function in the host's **Xenon** registry.

---

## 🔗 Route Parameters

### Required Parameters
Capture segments of the URI by using the `:` prefix:

```typescript
router.get('/user/:id', (c) => {
  const id = c.req.param('id');
  return c.text(`User ID: ${id}`);
});
```

### Optional Parameters
Append a `?` to the parameter name:

```typescript
router.get('/user/:name?', (c) => {
  const name = c.req.param('name') || 'Guest';
  return c.text(`Hello ${name}`);
});
```

---

## 🏷️ Named Routes

Named routes allow the convenient generation of URLs. You can specify a name by chaining the `name` method:

```typescript
router.get('/user/profile', [UserController, 'show']).name('profile');
```

### Generating URLs
Use the `c.route()` helper to generate URLs for named routes:

```typescript
// Simple route
const url = c.route('profile');

// Route with parameters
router.get('/user/:id', [UserController, 'show']).name('user.show');
const urlWithParam = c.route('user.show', { id: 42 }); // /user/42
```

---

## 👥 Route Groups

Groups allow you to share attributes like middleware or prefixes across multiple routes.

```typescript
router.prefix('/admin').middleware(auth()).group((admin) => {
  admin.get('/dashboard', [AdminController, 'index']);
  admin.get('/users', [AdminController, 'users']);
});
```

---

## 📦 Resource Routes

Gravito follows RESTful conventions via the `resource` method:

```typescript
router.resource('photos', PhotoController);
```

| Verb | Action | URI | Method Name |
| --- | --- | --- | --- |
| GET | `index` | `/photos` | `index` |
| POST | `store` | `/photos` | `store` |
| GET | `show` | `/photos/:id` | `show` |
| PUT | `update` | `/photos/:id` | `update` |
| DELETE | `destroy` | `/photos/:id` | `destroy` |

---

## 🛡️ Signed URLs

Generate URLs with a cryptographic signature to prevent tampering:

```typescript
// Generate
const url = c.route('unsubscribe', { user: 1 }).signed();

// Verify
router.get('/unsubscribe/:user', (c) => {
  if (!c.req.hasValidSignature()) {
    return c.forbidden();
  }
}).name('unsubscribe');
```

---

## 🔗 Further Reading
- 🛡️ [Middleware](./middleware.md)
- 📥 [Requests](./requests.md)
- 📤 [Responses](./responses.md)
