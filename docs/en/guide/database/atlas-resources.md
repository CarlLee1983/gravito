# API Resources

When building an API, returning your models directly is often not the best practice. You might need to rename attributes, hide sensitive data, transform data formats, or return different structures based on user permissions.

Although Atlas does not include a dedicated `JsonResource` class, we recommend using **Standard TypeScript Classes** to implement this pattern. This approach is not only type-safe but also highly performant.

## Defining Resources

A resource class is essentially a wrapper responsible for transforming a model into an array or object.

Let's create a simple `UserResource` class:

```typescript
import type { User } from '../models/User';

export class UserResource {
  constructor(private user: User) {}

  /**
   * Static factory method for easier chaining
   */
  static make(user: User | null): UserResource | null {
    if (!user) return null;
    return new UserResource(user);
  }

  /**
   * Transform the resource into a JSON structure
   */
  toJSON() {
    return {
      id: this.user.id,
      full_name: this.user.name, // Rename attribute
      email: this.user.email,
      is_active: Boolean(this.user.active), // Transform format
      created_at: this.user.created_at.toISOString(),
      updated_at: this.user.updated_at.toISOString(),
    };
  }
}
```

## Using Resources

In your Controller, you can use the resource to wrap your model and return it:

```typescript
import { User } from '../models/User';
import { UserResource } from '../resources/UserResource';

export class UserController {
  async show(c: Context) {
    const user = await User.find(1);
    
    return c.json(UserResource.make(user));
  }
}
```

Since most modern frameworks (including Gravito/Hono) automatically call the `toJSON()` method when serializing JSON, the code above will automatically output the transformed structure.

## Resource Collections

To transform an array of models, we can add a static method to the resource class:

```typescript
export class UserResource {
  // ... other code

  static collection(users: User[]) {
    return users.map((user) => UserResource.make(user));
  }
}
```

Usage:

```typescript
const users = await User.all();

return c.json(UserResource.collection(users));
```

## Handling Relationships

An important feature of resources is handling related data. You should check if a relationship is loaded to avoid N+1 query issues.

```typescript
import { PostResource } from './PostResource';

export class UserResource {
  // ...

  toJSON() {
    return {
      id: this.user.id,
      name: this.user.name,
      
      // Include only if the 'posts' relationship is loaded
      posts: this.user.posts 
        ? PostResource.collection(this.user.posts) 
        : undefined,
    };
  }
}
```

This way, if you used `.with('posts')` in your query, the `posts` field will appear in the API response; otherwise, it will be omitted.

## Conditional Attributes

Sometimes you may only want to return certain fields under specific conditions (e.g., if the current user is an administrator):

```typescript
export class UserResource {
  constructor(
    private user: User, 
    private isAdmin: boolean = false
  ) {}

  toJSON() {
    return {
      id: this.user.id,
      name: this.user.name,
      // Visible only to admins
      ...(this.isAdmin && { email: this.user.email, phone: this.user.phone }),
    };
  }
}
```

## Why Not Use an Automation Library?

Using native TypeScript classes offers several significant advantages:

1.  **Extreme Performance**: No complex reflection or runtime overhead; it's just simple object property access.
2.  **Type Safety**: Your IDE can fully understand your response structure. If sharing types with the frontend, you get full autocomplete support.
3.  **Flexibility**: You can freely add methods, computed properties, or dependency injection without being constrained by a framework.
