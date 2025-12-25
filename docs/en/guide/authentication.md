# Authentication (Fortify)

Gravito Fortify provides a complete, ready-to-use authentication system inspired by Laravel Breeze and Fortify. With a single CLI command, you get login, registration, password reset, and email verification — all beautifully styled and fully functional.

## Quick Start

### Installation

```bash
# Install the packages
bun add @gravito/fortify @gravito/sentinel

# Scaffold authentication files
bun gravito fortify:install
```

### Choose Your Stack

Fortify supports three view stacks:

```bash
# Default: Built-in HTML templates
bun gravito fortify:install

# Inertia + React
bun gravito fortify:install --stack=react

# Inertia + Vue
bun gravito fortify:install --stack=vue
```

### Run Migrations

```bash
bun gravito migrate
```

### Configure Your Application

Add `FortifyOrbit` to your `gravito.config.ts`:

```typescript
import { FortifyOrbit } from '@gravito/fortify'
import { User } from './src/models/User'

export default {
  orbits: [
    new FortifyOrbit({
      userModel: () => User,
      features: {
        registration: true,
        resetPasswords: true,
        emailVerification: false,
      },
      redirects: {
        login: '/dashboard',
        logout: '/',
      },
    })
  ]
}
```

That's it!Visit `/login` to see your authentication pages.

## Generated Files

The `fortify:install` command generates:

| File | Description |
|------|-------------|
| `config/fortify.ts` | Configuration file |
| `src/models/User.ts` | User model with standard fields |
| `src/database/migrations/xxx_create_users_table.ts` | Users table migration |
| `src/database/migrations/xxx_create_password_reset_tokens_table.ts` | Password reset tokens migration |
| `src/pages/auth/*.tsx` or `*.vue` | View templates (React/Vue only) |

## Routes

| Method | URI | Description |
|--------|-----|-------------|
| GET | `/login` | Display login form |
| POST | `/login` | Handle login attempt |
| POST | `/logout` | Handle logout |
| GET | `/register` | Display registration form |
| POST | `/register` | Handle registration |
| GET | `/forgot-password` | Display forgot password form |
| POST | `/forgot-password` | Send password reset link |
| GET | `/reset-password/:token` | Display reset password form |
| POST | `/reset-password` | Handle password reset |
| GET | `/verify-email` | Display verification notice |
| GET | `/verify-email/:id/:hash` | Verify email address |
| POST | `/email/verification-notification` | Resend verification email |

## Configuration

### Feature Toggles

```typescript
new FortifyOrbit({
  userModel: () => User,
  features: {
    registration: true,      // Enable user registration
    resetPasswords: true,    // Enable password reset
    emailVerification: true, // Enable email verification
  },
})
```

### Custom Redirects

```typescript
new FortifyOrbit({
  userModel: () => User,
  redirects: {
    login: '/dashboard',         // After successful login
    logout: '/',                 // After logout
    register: '/welcome',        // After registration
    passwordReset: '/login',     // After password reset
    emailVerification: '/home',  // After email verification
  },
})
```

### Route Prefix

Add a prefix to all authentication routes:

```typescript
new FortifyOrbit({
  userModel: () => User,
  prefix: '/auth', // Routes become /auth/login, /auth/register, etc.
})
```

### SPA / API Mode

For single-page applications or API-first development:

```typescript
new FortifyOrbit({
  userModel: () => User,
  jsonMode: true, // Returns JSON instead of redirects
})
```

**JSON Response Examples:**

```json
// POST /login (success)
{
  "message": "Login successful",
  "user": { "id": 1, "name": "Alice", "email": "alice@example.com" },
  "redirect": "/dashboard"
}

// POST /login (failure)
{
  "error": "Invalid credentials"
}
```

## Middleware

### Verified Email

Protect routes that require a verified email:

```typescript
import { verified } from '@gravito/fortify'

router.middleware(verified).group((r) => {
  r.get('/premium-content', premiumHandler)
  r.post('/create-team', createTeamHandler)
})
```

If the user's email is not verified:
- **Server-rendered apps**: Redirects to `/verify-email`
- **API mode** (`Accept: application/json`): Returns `403 Forbidden`

## Custom Views

### HTML Stack

When using the built-in HTML stack, Fortify provides modern, dark-themed login pages out of the box. To customize:

1. Create your own view templates
2. Configure the paths in `fortify.ts`:

```typescript
new FortifyOrbit({
  userModel: () => User,
  views: {
    login: 'auth/login',
    register: 'auth/register',
    forgotPassword: 'auth/forgot-password',
    resetPassword: 'auth/reset-password',
    verifyEmail: 'auth/verify-email',
  },
})
```

### Inertia React/Vue

For Inertia stacks, the views are generated in `src/pages/auth/`. Customize them directly:

- `src/pages/auth/Login.tsx` (or `.vue`)
- `src/pages/auth/Register.tsx`
- `src/pages/auth/ForgotPassword.tsx`

## Events

Fortify dispatches events for key authentication actions:

```typescript
// Listen to authentication events
core.events.on('auth.login', (user) => {
  console.log('User logged in:', user.email)
})

core.events.on('auth.register', (user) => {
  // Send welcome email, track analytics, etc.
})

core.events.on('auth.logout', (user) => {
  // Clean up user session data
})

core.events.on('auth.password-reset', (user) => {
  // Notify user of password change
})
```

## Email Integration

Fortify is designed to work with `@gravito/orbit-mail` for sending emails:

```typescript
import { MailOrbit } from '@gravito/orbit-mail'

// Configure mail in your application
new MailOrbit({
  driver: 'smtp',
  host: process.env.MAIL_HOST,
  port: 587,
  username: process.env.MAIL_USERNAME,
  password: process.env.MAIL_PASSWORD,
})
```

> **Note:** Email sending is coming in a future release. Currently, reset links and verification URLs are logged to the console.

## Security Best Practices

1. **Rate Limiting**: Consider adding rate limiting to login/register routes
2. **HTTPS**: Always use HTTPS in production
3. **Strong Passwords**: Implement password complexity requirements
4. **Session Security**: Configure secure session settings

```typescript
// Example: Rate limiting login attempts
import { rateLimiter } from '@gravito/sentinel'

router.post('/login', rateLimiter({ max: 5, window: '15m' }), loginHandler)
```

## Next Steps

- Learn about [Authorization](/guide/authorization) to control user permissions
- Set up [Session Management](/guide/sessions) for persistent login
- Configure [Email Notifications](/guide/mail) for transactional emails
