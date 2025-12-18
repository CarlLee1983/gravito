---
title: Laravel 12 MVC Parity
---

# Laravel 12 MVC Parity

This page compares Gravito (core + Orbits) with Laravel 12’s “full-stack MVC” feature set, so we can see what is already covered, what is partially covered, and what is still missing.

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
| HTTP Kernel / Middleware | `gravito-core` Router + Hono middleware; Orbit-provided middleware (Auth/Session/…) |
| Exception Handler | `gravito-core` `PlanetCore` error + notFound handlers and hooks |
| Events / Listeners | `gravito-core` `EventManager` / `Listener` |
| Validation (FormRequest) | `@gravito/orbit-request` (`FormRequest`) + `@gravito/validator` |
| Views / Blade | `@gravito/orbit-view` (TSX template engine) / `@gravito/orbit-inertia` (Inertia bridge) |
| Database / Eloquent | `@gravito/orbit-db` (Drizzle-based DB layer) |
| Auth / Gate / Policies | `@gravito/orbit-auth` (guards + `Gate`) |
| Cache | `@gravito/orbit-cache` |
| Queue / Jobs | `@gravito/orbit-queue` |
| Scheduler | `@gravito/orbit-scheduler` |
| Mail | `@gravito/orbit-mail` |
| Notifications | `@gravito/orbit-notifications` |
| Broadcasting | `@gravito/orbit-broadcasting` |
| Storage | `@gravito/orbit-storage` |
| i18n | `@gravito/orbit-i18n` |

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
| Routing + route groups + middleware stacking | Implemented | Laravel-like fluent API on top of Hono |
| Controller routing | Implemented | `[ControllerClass, 'method']` |
| FormRequest validation at route-level | Implemented | Duck-typed integration in `Router` |
| Named routes + URL generation | Missing | No `route('name', params)` equivalent yet |
| Route model binding | Missing | Needs a binding/resolution layer for params → models |
| Resource routes | Missing | No `Route::resource()` equivalent |
| Rate limiting / throttling | Missing | No first-class limiter middleware/driver |

### Sessions / CSRF / Cookies

| Feature | Status | Notes |
|--------|--------|------|
| Sessions | Implemented | `@gravito/orbit-session` |
| CSRF protection | Implemented | `@gravito/orbit-session` |
| “Flash” data patterns | Partial | Supported in validation flow; needs a standard API surface |
| Cookie encryption / signing | Missing | Needs a crypto/key management design |

### Validation

| Feature | Status | Notes |
|--------|--------|------|
| FormRequest-style validation | Implemented | Zod + Valibot supported |
| Authorization inside FormRequest | Implemented | Returns 403 or throws `AuthorizationException` via middleware helper |
| Custom messages + i18n hook points | Partial | Message provider exists; needs first-class integration docs/examples |
| Rule object ecosystem (Laravel “rules”) | Missing | Would require a shared rule contract and registry |

### Views / Frontend

| Feature | Status | Notes |
|--------|--------|------|
| Server-rendered HTML entry | Implemented | App shell rendering via Orbit View / Core |
| SPA bridge (Inertia) | Implemented | `@gravito/orbit-inertia` |
| Blade-compatible templating | Missing | Gravito uses TSX templates instead of Blade |
| Asset pipeline conventions | Partial | Templates exist; conventions still evolving |

### Database / ORM

| Feature | Status | Notes |
|--------|--------|------|
| Migrations (apply/status/fresh) | Partial | CLI exists; driver strategy still maturing |
| Seed runner | Partial | Runner exists; scaffolding/workflow needs tightening |
| Active Record-style models | Partial | `Model` exists; feature set is smaller than Eloquent |
| Relations | Partial | Common relations are supported; parity with Eloquent is not complete |
| Model factories | Missing | No standard factory system |
| Soft deletes | Missing | No built-in deleted-at patterns |
| Polymorphic relations | Missing | Requires ORM design work |
| Pagination helpers | Missing | No standard paginator contract yet |

### Authentication / Authorization

| Feature | Status | Notes |
|--------|--------|------|
| Auth guards (session/jwt/token) | Implemented | `@gravito/orbit-auth` |
| Auth middleware (`auth`, `guest`) | Implemented | |
| Gates / abilities | Implemented | `Gate.define()` + `authorize()` |
| Policies | Partial | Manual mapping supported; no discovery/scaffolding |
| Password reset / email verification | Missing | Needs mail + token + persistence workflow |
| Hashing (bcrypt/argon) service | Missing | Needs a standard password hashing provider |

### Queues / Scheduler

| Feature | Status | Notes |
|--------|--------|------|
| Jobs + workers | Implemented | Multi-driver design in `@gravito/orbit-queue` |
| Retries/backoff/timeout conventions | Partial | Some concepts exist; needs standardized surface + docs |
| Scheduler | Implemented | `@gravito/orbit-scheduler` |
| Queue dashboard (Horizon-like) | Missing | No monitoring UI yet |

### Mail / Notifications / Broadcasting

| Feature | Status | Notes |
|--------|--------|------|
| Mail sending | Implemented | `@gravito/orbit-mail` |
| Notifications | Implemented | `@gravito/orbit-notifications` |
| Broadcasting | Implemented | `@gravito/orbit-broadcasting` |
| Channel ecosystem (Slack/SMS/WebPush/…) | Partial | Needs more drivers + contracts |

### Cache / Storage / i18n

| Feature | Status | Notes |
|--------|--------|------|
| Cache | Implemented | `@gravito/orbit-cache` |
| Storage | Implemented | `@gravito/orbit-storage` |
| Localization (i18n) | Implemented | `@gravito/orbit-i18n` |

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
| First-class HTTP testing helpers | Missing | No test harness like Laravel’s `TestResponse` |
| Mail/Notification fakes | Missing | Needs test doubles + contracts |

## Roadmap Suggestions (Laravel-Style Completeness)

### P0 (Unblock common production apps)

- Named routes + URL generator.
- Rate limiting middleware + driver contract.
- Cookie signing/encryption primitives (key management + rotation story).
- Tighten DB workflows: seed scaffolding + consistent migration workflow.

### P1 (Eloquent/Laravel ergonomics)

- Resource routes, route model binding, route caching strategy.
- Pagination contract + helpers.
- Soft deletes + model “casts” / accessors patterns.
- Auth hashing + password reset/email verification workflow.

### P2 (Ecosystem and observability)

- Queue dashboard + job observability.
- Tracing/metrics/health-check Orbit (OpenTelemetry-ready).
- Testing fakes (mail/notifications/queue) + HTTP testing utilities.
