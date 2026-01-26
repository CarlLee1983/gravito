# OrbitEcho

`OrbitEcho` is the official webhook orchestration module for Gravito. It provides a secure way to receive incoming webhooks (e.g., from Stripe, GitHub) and a reliable way to dispatch outgoing webhooks to third-party services.

## Overview

As a Gravito Orbit, `OrbitEcho` integrates deeply with `PlanetCore`. It automatically sets up:
- A `WebhookReceiver` for processing incoming webhooks.
- An optional `WebhookDispatcher` for sending outgoing webhooks.
- Middleware for injecting the Echo instance into the request context.
- Registration of components in the IoC container.

## Constructor

```typescript
constructor(config: EchoConfig = {})
```

Creates a new `OrbitEcho` instance with the provided configuration.

### Parameters

- `config` (`EchoConfig`): The configuration object for providers, dispatcher, storage, and observability.

## Configuration (EchoConfig)

The `EchoConfig` interface defines the setup for the Echo module.

| Property | Type | Description |
|---|---|---|
| `providers` | `Record<string, WebhookProviderConfig>` | Map of named provider configurations for receiving webhooks. |
| `dispatcher` | `WebhookDispatcherConfig` | Settings for sending webhooks to other services. |
| `basePath` | `string` | The URL prefix for generated webhook endpoints (default: `/webhooks`). |
| `store` | `WebhookStore` | Persistence store for logging received and sent events. |
| `deadLetterQueue` | `DeadLetterQueue` | Queue for storing failed delivery attempts. |
| `batch` | `BatchDispatchOptions` | Default options for batch dispatching. |
| `observability` | `EchoObservabilityConfig` | Settings for metrics, tracing, and logging. |

## Methods

### `install(core: PlanetCore): void`

Installs the Echo module into the Gravito ecosystem.

- Binds `echo`, `echo.receiver`, and `echo.dispatcher` to the IoC container.
- Registers a global middleware to inject `echo` into `c.get('echo')`.

### `getReceiver(): WebhookReceiver`

Returns the `WebhookReceiver` instance used for processing incoming webhooks.

### `getDispatcher(): WebhookDispatcher | undefined`

Returns the `WebhookDispatcher` instance for outgoing webhooks, or `undefined` if not configured.

### `getConfig(): EchoConfig`

Returns the current configuration of the Echo module.

## Examples

### Basic Setup

```typescript
import { OrbitEcho } from '@gravito/echo'
import { PlanetCore } from '@gravito/core'

const core = new PlanetCore()
const echo = new OrbitEcho({
  providers: {
    stripe: { 
      name: 'stripe', 
      secret: process.env.STRIPE_SECRET! 
    }
  }
})

core.addOrbit(echo)
```

### With Dispatcher and Storage

```typescript
const echo = new OrbitEcho({
  dispatcher: {
    secret: 'my-outgoing-secret',
    retry: { maxAttempts: 5 }
  },
  store: new MyDatabaseStore(),
  deadLetterQueue: new MyDLQ()
})
```
