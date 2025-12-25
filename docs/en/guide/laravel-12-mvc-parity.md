---
title: Laravel 12 MVC Parity
---

# Laravel 12 MVC Parity

This page compares Gravito (core + Kinetic Modules) with Laravel 12’s “full-stack MVC” feature set, so we can see what is already covered, what is partially covered, and what is still missing.

## Legend

| Status | Meaning |
|--------|---------|
| Implemented | Available today and usable in production flows |
| Partial | Works for common cases, but missing key Laravel-level capabilities |
| Missing | Not available yet (needs design + implementation) |

## Concept Mapping (Laravel → Gravito)

| Laravel | Gravito |
|--------|---------|
| Service Container, Service Providers | `gravito-core` (`Container`, `ServiceProvider`) |
| HTTP Kernel / Middleware | `gravito-core` Router + Native middleware; Gravito-provided middleware (Auth/Session/…) |
| Exception Handler | `gravito-core` `PlanetCore` error + notFound handlers and hooks |
| Events / Listeners | `gravito-core` `EventManager` / `Listener` |
| Validation (FormRequest) | `@gravito/mass` (`FormRequest`) |
| Views / Blade | `@gravito/prism` (TSX template engine) / `@gravito/ion` (Inertia bridge) |
| Database / Eloquent | `@gravito/atlas` (Drizzle-based DB layer) |
| Auth / Gate / Policies | `@gravito/sentinel` (guards + `Gate`) |
| Cache | `@gravito/stasis` |
| Queue / Jobs | `@gravito/stream` |
| Scheduler | `@gravito/horizon` |
| Mail | `@gravito/signal` |
| Notifications | `@gravito/flare` |
| Broadcasting | `@gravito/radiance` |
| Storage | `@gravito/nebula` |
| i18n | `@gravito/cosmos` |

## Feature Matrix

### Application Core

| Feature | Status | Notes |
|--------|--------|------|
| IoC Container | Implemented | Bind/resolve services via `Container` |
| Service Providers | Implemented | `register()` + optional `boot()` |
| Configuration + environment variables | Implemented | `ConfigManager` (Bun env + runtime config) |
| Facades / static proxies | Missing | Needs a consistent DX story in TS |
| Feature flags / “config caching” | Missing | No standardized build-time/runtime caching pipeline |

### HTTP Layer (Routing / Middleware)

| Feature | Status | Notes |
|--------|--------|------|
| Routing + route groups + middleware stacking | Implemented | Laravel-like fluent API on top of native engine |
| Controller routing | Implemented | `[ControllerClass, 'method']` |
| FormRequest validation at route-level | Implemented | Duck-typed integration in `Router` |
| Named routes + URL generation | Implemented | `router.get(...).name('home')` and `router.url('home')` |
| Rate limiting / throttling | Implemented | `ThrottleRequests` middleware + Cache store backing |
| Resource routes | Implemented | `router.resource('users', UsersController)` |
| Route model binding | Implemented | `router.bind('user', async (id) => ...)` exposes `c.get('routeModels').user` |
| Route cache strategy | Implemented | CLI `route:cache` persists named routes manifest for URL generation |

### Sessions / CSRF / Cookies

| Feature | Status | Notes |
|--------|--------|------|
| Sessions | Implemented | `@gravito/pulsar` |
| CSRF protection | Implemented | `@gravito/pulsar` |
| Cookie encryption | Implemented | `CookieJar` + AES-256-CBC Encrypter |
| Cookie signing | Missing | Needs a first-class signing primitive (key rotation story) |
| “Flash” data patterns | Implemented | `session.flash(key, value)` |

### Validation

| Feature | Status | Notes |
|--------|--------|------|
| FormRequest-style validation | Implemented | High-performance TypeBox validation via `@gravito/mass` |
| Authorization inside FormRequest | Implemented | Returns 403 or throws `AuthorizationException` via middleware helper |
| Custom messages + i18n hook points | Implemented | Integrated with `@gravito/cosmos` and `@gravito/mass` |
| Rule object ecosystem (Laravel “rules”) | Missing | Would require a shared rule contract and registry |

### Views / Frontend

| Feature | Status | Notes |
|--------|--------|------|
| Server-rendered HTML entry | Implemented | App shell rendering via Prism / Core |
| SPA bridge (Inertia) | Implemented | `@gravito/ion` |
| Blade-compatible templating | Missing | Gravito uses TSX templates instead of Blade |
| Asset pipeline conventions | Partial | Templates exist; conventions still evolving |

### Database / ORM

| Feature | Status | Notes |
|--------|--------|------|
| Migrations (apply/status/fresh) | Implemented | `gravito migrate` via `drizzle-kit migrate` |
| Seed runner | Implemented | `gravito db:seed` |
| Active Record-style models | Implemented | `Model` with CRUD, relations, scopes and Proxy-based Smart Guard |
| Relations | Implemented | HasOne, HasMany, BelongsTo, BelongsToMany, and Polymorphic relations |
| Model factories | Implemented | Powerful test-data generation via `@gravito/atlas` |
| Soft deletes | Implemented | `withTrashed()`, `onlyTrashed()`, `restore()` |
| Polymorphic relations | Implemented | `@MorphTo()`, `@MorphOne()`, `@MorphMany()` for flexible data structures |
| Pagination helpers | Implemented | `Paginator` class + `Model.paginate()` |

### Authentication / Authorization

| Feature | Status | Notes |
|--------|--------|------|
| Auth guards (session/jwt/token) | Implemented | `@gravito/sentinel` |
| Auth middleware (`auth`, `guest`) | Implemented | |
| Gates / abilities | Implemented | `Gate.define()` + `authorize()` |
| Policies | Partial | Manual mapping supported; no discovery/scaffolding |
| Hashing (bcrypt/argon) service | Implemented | `core.hasher` (via `Bun.password`) |
| Password reset / email verification | Partial | Provides primitives (`PasswordBroker`, `EmailVerificationService`) |

### Queues / Scheduler

| Feature | Status | Notes |
|--------|--------|------|
| Jobs + workers | Implemented | Multi-driver design in `@gravito/stream` |
| Retries/backoff/timeout conventions | Partial | Some concepts exist; needs standardized surface + docs |
| Scheduler | Implemented | `@gravito/horizon` |
| Queue dashboard (Horizon-like) | Missing | No monitoring UI yet |

### Mail / Notifications / Broadcasting

| Feature | Status | Notes |
|--------|--------|------|
| Mail sending | Implemented | `@gravito/signal` |
| Notifications | Implemented | `@gravito/flare` |
| Broadcasting | Implemented | `@gravito/radiance` |
| Channel ecosystem (Slack/SMS/WebPush/…) | Partial | Needs more drivers + contracts |

### Cache / Storage / i18n

| Feature | Status | Notes |
|--------|--------|------|
| Cache | Implemented | `@gravito/stasis` |
| Storage | Implemented | `@gravito/nebula` |
| Localization (i18n) | Implemented | `@gravito/cosmos` |

### Observability

| Feature | Status | Notes |
|--------|--------|------|
| Structured logging | Implemented | Core `Logger` |
| Exception reporting hooks | Implemented | `error:*` and `processError:*` hooks |
| Tracing / metrics / health checks | Missing | No built-in OpenTelemetry/metrics/health module yet |

### Testing / Developer Experience

| Feature | Status | Notes |
|--------|--------|------|
| CLI (Artisan-like) | Partial | `route:list`, `tinker`, migrations; limited scaffolding |
| App skeleton/templates | Implemented | `templates/*` |
| First-class HTTP testing helpers | Implemented | `HttpTester` & `TestResponse` (Laravel style) |
| Mail/Notification fakes | Missing | Needs test doubles + contracts |

## Roadmap Suggestions (Laravel-Style Completeness)

### P1 (Eloquent/Laravel ergonomics)

- Resource routes + route model binding are implemented; route cache is available as a named-routes manifest.
- Pagination helpers, soft deletes, and polymorphic relations are implemented.
- HTTP Testing Harness (`TestResponse`) is implemented.
- Auth hashing is implemented; password reset/email verification still needs end-to-end app workflows (mail + persistence + default controllers).

### P2 (Ecosystem and observability)

- Queue dashboard + job observability.
- Tracing/metrics/health-check Gravito (OpenTelemetry-ready).
- Testing fakes (mail/notifications/queue) + HTTP testing utilities.
