# @gravito/fortify

End-to-End Authentication Workflows for the Gravito Framework.

Inspired by Laravel Fortify and Breeze, this package provides ready-to-use authentication features:

- ✅ User Registration
- ✅ Login / Logout
- ✅ Password Reset
- ✅ Email Verification
- ✅ API Tokens (Sanctum-style)
- 🚧 Two-Factor Authentication (coming soon)

## Installation

```bash
bun add @gravito/fortify @gravito/sentinel
```

## Quick Start

### 1. Configure Fortify

```typescript
// gravito.config.ts
import { FortifyOrbit } from '@gravito/fortify'
import { User } from './models/User'

export default {
  orbits: [
    new FortifyOrbit({
      userModel: () => User,
      features: {
        registration: true,
        resetPasswords: true,
        emailVerification: true,
      },
      redirects: {
        login: '/dashboard',
        logout: '/',
      },
    })
  ]
}
```

### 2. Run Migrations

```bash
bun gravito migrate
```

### 3. You're Done!

Visit `/login`, `/register`, or `/forgot-password` to see auth pages.

## Routes

| Method | URI | Description |
|--------|-----|-------------|
| GET | `/login` | Show login form |
| POST | `/login` | Handle login |
| POST | `/logout` | Handle logout |
| GET | `/register` | Show registration form |
| POST | `/register` | Handle registration |
| GET | `/forgot-password` | Show forgot password form |
| POST | `/forgot-password` | Send reset link |
| GET | `/reset-password/:token` | Show reset form |
| POST | `/reset-password` | Handle reset |
| GET | `/verify-email` | Show verification notice |
| GET | `/verify-email/:id/:hash` | Verify email |
| POST | `/email/verification-notification` | Resend verification |
| GET | `/tokens` | List all tokens |
| POST | `/tokens` | Create a new token |
| DELETE | `/tokens/:id` | Revoke a token |
| DELETE | `/tokens` | Revoke all tokens |

## Configuration

```typescript
interface FortifyConfig {
  // Feature toggles
  features: {
    registration?: boolean      // Default: true
    resetPasswords?: boolean    // Default: true
    emailVerification?: boolean // Default: false
    apiTokens?: boolean         // Default: false
  }
  
  // Redirect paths
  redirects: {
    login?: string       // Default: '/dashboard'
    logout?: string      // Default: '/'
    register?: string    // Default: '/dashboard'
  }
  
  // User model factory
  userModel: () => typeof Model
  
  // Use JSON responses (for SPA mode)
  jsonMode?: boolean
  
  // Route prefix
  prefix?: string
}
```

## SPA / API Mode

For single-page applications, enable `jsonMode`:

```typescript
new FortifyOrbit({
  userModel: () => User,
  jsonMode: true,
})
```

All endpoints will return JSON responses instead of redirects.

## Custom Views

### HTML Templates

Copy templates from `@gravito/fortify/views/html` and customize.

### Inertia (React)

```bash
bun gravito fortify:install --stack=react
```

### Inertia (Vue)

```bash
bun gravito fortify:install --stack=vue
```

## Middleware

### Verified Email

```typescript
import { verified } from '@gravito/fortify'

router.middleware(verified).group((r) => {
  r.get('/dashboard', dashboardHandler)
})
```

## API Tokens

Fortify includes a simple token authentication system for APIs (Sanctum-style).

### Enable Feature

```typescript
new FortifyOrbit({
  // ...
  features: {
    apiTokens: true,
  },
})
```

### Usage

1. **Create Token**: POST to `/tokens` with JSON body `{ "name": "My Token" }`.
   Response includes `plain_text_token` (e.g. `1|abcdef...`). Store this securely!

2. **Authenticate**: Add header to requests:
   ```
   Authorization: Bearer 1|abcdef...
   ```

### Middleware

```typescript
import { bearerTokenAuth } from '@gravito/fortify'

// Middleware is automatically applied to /tokens routes when enabled.
// Use it in your own API routes:
router.get('/api/user', bearerTokenAuth(fortify.tokenService), (c) => {
  return c.json(c.get('auth:user'))
})
```

## License

MIT
