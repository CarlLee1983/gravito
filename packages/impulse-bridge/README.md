# @gravito/impulse-bridge 🌉

The validation bridge between **Impulse** (Backend) and **Frontend** (Inertia/Prism).

`@gravito/impulse-bridge` is a synchronization layer that allows you to share backend `FormRequest` validation rules, fields, and error messages with your frontend components. It ensures a "Single Source of Truth" for validation logic across the entire stack.

## 🌟 Key Features

- **Blueprint Sharing**: Automatically serialize `FormRequest` classes into frontend-consumable blueprints.
- **Inertia.js Integration**: First-class support for sharing blueprints via Inertia's shared props.
- **Middleware Support**: Register and share multiple form blueprints globally or per-route using middleware.
- **Zero Duplication**: Define your validation rules once in TypeScript on the server, and let the frontend use them for real-time validation.

## 🛠️ Installation

```bash
bun add @gravito/impulse-bridge
```

## 🚀 Usage

### 1. Manual Sharing in Controllers

You can share a specific `FormRequest` blueprint directly within your controller methods.

```typescript
import { ImpulseBridge } from '@gravito/impulse-bridge';
import { RegisterRequest } from './requests/RegisterRequest';

export class AuthController {
  async showRegister(ctx: GravitoContext) {
    // Share the blueprint with the key 'register'
    ImpulseBridge.share(ctx, 'register', RegisterRequest);

    return ctx.inertia('Auth/Register');
  }
}
```

### 2. Using Middleware

Automatically share blueprints for a group of routes.

```typescript
import { impulseBridgeMiddleware } from '@gravito/impulse-bridge';
import { ContactRequest } from './requests/ContactRequest';

router.group({
  middleware: [
    impulseBridgeMiddleware({
      contact: ContactRequest,
    }),
  ],
}, () => {
  router.get('/contact', 'ContactController@show');
});
```

### 3. Frontend Usage

On the frontend (Inertia.js), the blueprints will be available in the `blueprints` shared property:

```javascript
// Example in a React component
const { blueprints } = usePage().props;
const registerBlueprint = blueprints.register;

// Use with your frontend validation library (e.g., @gravito/prism-form)
```

## 📦 Peer Dependencies

- `@gravito/core`: The Gravito micro-kernel.
- `@gravito/impulse`: The validation and form handling engine.

## 📄 License

MIT © Carl Lee
