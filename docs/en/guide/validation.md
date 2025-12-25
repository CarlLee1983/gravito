# Validation

Gravito provides powerful validation features to ensure that the data your application handles is clean and expected. The recommended way is to use **Form Requests**.

## Creating Form Requests

A Form Request is a class that encapsulates validation logic. Typically, we use **Impulse** (based on Zod) to define the schema.

```typescript
import { FormRequest } from '@gravito/impulse';
import { z } from 'zod';

export class StoreUserRequest extends FormRequest {
  // Define Zod validation schema
  schema = z.object({
    name: z.string().min(2).max(255),
    email: z.string().email(),
    password: z.string().min(8),
  });
}
```

## Using Validation in Routes

To use a Form Request in your route, pass it as the second argument to the route method:

```typescript
routes.post('/user', StoreUserRequest, [UserController, 'store']);
```

### Validation Workflow

1.  When a request enters, Gravito automatically instantiates the `StoreUserRequest`.
2.  Validation is performed. If it fails, a `422 Unprocessable Entity` response with error messages is automatically returned.
3.  If validation passes, the request continues to the controller.

## Retrieving Validated Data

In your controller, you can safely retrieve the validated data:

```typescript
async store(c: Context) {
  // Retrieve validated data with correct types
  const data = c.req.valid('json');
  
  const user = await User.create(data);
  return c.json(user, 201);
}
```

Note: `Model.create()` is async and persists immediately. Use `Model.make()` if you need an in-memory instance before calling `save()`.
