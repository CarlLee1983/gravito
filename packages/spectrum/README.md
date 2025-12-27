# @gravito/spectrum

> **The Gravito Debug Dashboard.**
> Real-time observability, request replay, and deep insights for your local development workflow.

`@gravito/spectrum` is a powerful, zero-config debug dashboard designed specifically for the Gravito ecosystem. It acts as a telescope for your application, capturing HTTP requests, database queries, logs, and exceptions in real-time.

![Spectrum Dashboard](https://via.placeholder.com/1200x600/0f172a/38bdf8?text=Gravito+Spectrum+UI)

## ✨ Features

- **⚡️ Real-time Updates**: Powered by Server-Sent Events (SSE), observe requests as they happen without refreshing.
- **🔍 Deep Inspection**: View detailed request/response headers, bodies, and execution time.
- **🗄️ Database Profiling**: Automatically captures `@gravito/atlas` SQL queries with bindings and duration.
- **↺ Request Replay**: One-click replay of any captured request to quickly reproduce bugs or test fixes.
- **📊 Live Statistics**: Monitor error rates, average latency, and throughput in real-time.
- **💾 Persistence**: Support for File-based storage to keep debug data across server restarts.
- **🛡️ Security Gates**: Configurable authorization logic to secure the dashboard in sensitive environments.

## 📦 Installation

```bash
bun add @gravito/spectrum
```

## 🚀 Quick Start

Simply register the `SpectrumOrbit` in your application entry point:

```typescript
import { PlanetCore } from 'gravito-core'
import { SpectrumOrbit } from '@gravito/spectrum'

const core = new PlanetCore()

// Initialize Spectrum (Development only recommended)
if (process.env.NODE_ENV !== 'production') {
  await core.orbit(new SpectrumOrbit())
}

await core.liftoff()
```

Visit **http://localhost:3000/gravito/spectrum** to see your dashboard.

## ⚙️ Configuration

You can customize Spectrum by passing a configuration object.

```typescript
await core.orbit(new SpectrumOrbit({
  // Change the dashboard path
  path: '/_debug',
  
  // Storage Strategy (Memory or File)
  storage: new MemoryStorage(), 
  
  // Sample Rate (0.0 to 1.0)
  // Useful for high-traffic environments to prevent flooding
  sampleRate: 1.0, 
  
  // Security Gate (Authorization)
  gate: async (c) => {
    // Return true to allow access
    return c.req.ip === '127.0.0.1'
  }
}))
```

## 🛡️ Production Safety

Spectrum is designed primarily for **local development**. If you enable it in production, you **MUST** follow these rules:

1.  **Configure a Gate**: Never leave the dashboard open to the public.
2.  **Enable Persistence**: Use `FileStorage` so data isn't lost on restart, or stick to `MemoryStorage` to avoid filling up disk space.
3.  **Set Sample Rate**: Set `sampleRate: 0.1` (10%) or lower to avoid performance impact on high-traffic sites.

```typescript
if (process.env.NODE_ENV === 'production') {
  await core.orbit(new SpectrumOrbit({
    storage: new FileStorage({ directory: './storage/spectrum' }),
    sampleRate: 0.05, // Capture only 5% of requests
    gate: async (c) => c.req.header('x-admin-token') === process.env.ADMIN_TOKEN
  }))
}
```

## 🔌 Integrations

### Database (Atlas)

If `@gravito/atlas` is installed and loaded in your application, Spectrum automatically detects it and begins capturing all database queries. No extra configuration is needed.

### Logs (Logger)

Spectrum automatically wraps the core logger. Any call to `core.logger.info()`, `debug()`, `warn()`, or `error()` is captured and displayed in the dashboard alongside the request context.

## ❓ Spectrum vs Monitor

| Feature | `@gravito/spectrum` | `@gravito/monitor` |
|---------|---------------------|--------------------|
| **Goal** | **Local Debugging** | **Cluster Observability** |
| **Interface** | Built-in UI Dashboard | JSON / Prometheus / OTLP |
| **Scope** | Single Node (Stateful) | Distributed (Stateless) |
| **Data Retention** | Short-term (Recent 100) | Long-term (TSDB) |
| **Best For** | Developers fixing bugs | DevOps monitoring uptime |

If you are running in Kubernetes or Serverless and need aggregated logs from multiple instances, use **@gravito/monitor** with an external backend like Grafana or Datadog.

## License

MIT