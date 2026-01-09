---
title: Debug Dashboard (Spectrum)
description: Real-time insights into your Gravito application requests, logs, and database queries.
---

# Debug Dashboard (Spectrum)

> **Spectrum** is a real-time observability dashboard for Gravito. It provides a "telescope" view into your application's internals without requiring any external APM setup.

## Quick Installation

The fastest way to add Spectrum to your project is via the Gravito CLI:

```bash
gravito add:spectrum
```

This command will:
1. Install `@gravito/spectrum`.
2. Register the `SpectrumOrbit` in your `gravito.config.ts` or main entry file.
3. Configure default storage.

## Features

### ⚡️ Real-time Stream
Spectrum uses **Server-Sent Events (SSE)** to push data to the dashboard. You don't need to refresh the page to see new requests or logs—they appear instantly as they happen.

### 🌐 HTTP Request Inspection
Capture all incoming HTTP traffic. You can inspect:
- Request headers, query parameters, and body payloads.
- Response status codes and headers.
- Total execution time (latency).
- **Request Replay**: Re-run any captured request with a single click to debug logic or reproduce errors.

### 🗄️ Database Profiler
Spectrum automatically hooks into `@gravito/atlas` to capture every SQL query executed during a request.
- View raw SQL and its bindings.
- Track query performance to identify bottlenecks.
- Correlation: Every query is linked to the specific HTTP request that triggered it.

### 📜 Integrated Logs
Your application logs are streamed directly to the dashboard. Spectrum correlates logs with HTTP requests, so you can see exactly what was being logged during a specific user action.

---

## Manual Setup

If you prefer to set up Spectrum manually, register the `SpectrumOrbit` in your application entry:

```typescript
import { PlanetCore } from 'gravito-core'
import { SpectrumOrbit } from '@gravito/spectrum'

const core = new PlanetCore()

// We recommend enabling it only in development
if (process.env.NODE_ENV !== 'production') {
  await core.orbit(new SpectrumOrbit({
    path: '/gravito/spectrum' // Optional: Custom path
  }))
}

await core.liftoff()
```

---

## Configuration

Spectrum can be customized via the `SpectrumOrbit` constructor:

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `path` | `string` | `/gravito/spectrum` | The URL path where the dashboard will be hosted. |
| `storage` | `SpectrumStorage` | `MemoryStorage` | Where to store captured data. |
| `gate` | `Function` | `() => true` | Authorization logic for the dashboard. |
| `sampleRate` | `number` | `1.0` | Percentage of requests to capture (0.0 to 1.0). |

### Storage Strategies

- **MemoryStorage**: Zero-config, stored in RAM. Data is lost when the server restarts. Best for local development.
- **FileStorage**: Persists data to JSONL files. Useful for debugging issues that cause server restarts.

```typescript
import { SpectrumOrbit, FileStorage } from '@gravito/spectrum'

new SpectrumOrbit({
  storage: new FileStorage({ directory: './storage/spectrum' })
})
```

### Security Gates

Protect your debug data by defining a `gate`. This is essential if you ever enable Spectrum in a shared environment.

```typescript
new SpectrumOrbit({
  gate: async (context) => {
    const user = context.get('user')
    return user?.isAdmin === true
  }
})
```

---

## Production Security

**Caution:** Spectrum captures sensitive data (including request headers and bodies). If used in production:
1. **Always** implement a `gate` for authorization.
2. **Never** log sensitive information like passwords or credit card numbers in plain text.
3. **Use a Sample Rate**: Set `sampleRate: 0.1` to reduce performance overhead and disk usage.

---

## Next Steps
Check out the [Logging Guide](./logging.md) to learn how to enhance your log data for Spectrum.
