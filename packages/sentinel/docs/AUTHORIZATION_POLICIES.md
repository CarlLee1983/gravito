# Authorization Policies Guide

Authorization is the process of determining if a user has the permission to perform a specific action within a Satellite. Sentinel uses **Gates** and **Policies** to manage this.

## 1. Defining Abilities (Gates)

Gates are simple closures that determine if a user can perform an action. They are typically defined during the application bootstrap.

```typescript
import { Gate } from '@gravito/sentinel'

Gate.define('update-post', (user, post) => {
  return user.id === post.userId || user.isAdmin
})
```

## 2. Using Policies

Policies are classes that organize authorization logic around a particular model or resource.

```typescript
// satellites/blog/src/policies/PostPolicy.ts
import { User, Post } from '../models'

export class PostPolicy {
  update(user: User, post: Post) {
    return user.id === post.userId
  }
  
  delete(user: User, post: Post) {
    return user.isAdmin
  }
}
```

Register the policy:
```typescript
auth.registerPolicy(Post, new PostPolicy())
```

## 3. Checking Permissions in Handlers

You can check abilities directly in your Photon route handlers.

```typescript
app.patch('/posts/:id', async (c) => {
  const post = await Post.find(c.req.param('id'))
  const user = c.get('user')

  if (await auth.denies('update', post)) {
    return c.text('Forbidden', 403)
  }

  // Proceed with update...
})
```

## 4. RBAC (Role-Based Access Control)

Sentinel makes it easy to implement RBAC by checking user roles within gates.

```typescript
Gate.define('manage-users', (user) => {
  return user.roles.includes('admin')
})
```

## 5. ABAC (Attribute-Based Access Control)

For more complex scenarios, you can use ABAC to check attributes of both the user and the resource.

```typescript
Gate.define('view-document', (user, doc) => {
  return doc.isPublic || user.departmentId === doc.departmentId
})
```

## 6. Middleware Protection

Use the `can` middleware to protect routes based on abilities.

```typescript
import { can } from '@gravito/sentinel'

app.get('/admin/stats', can('view-admin-stats'), (c) => {
  // Only users with 'view-admin-stats' ability can enter
})
```
