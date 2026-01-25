# @gravito/zenith (Flux Console) 🧭

> Zero-config Control Plane and Monitoring Dashboard for Gravito Flux & Stream.

`@gravito/zenith` (also known as **Flux Console**) is the official management interface for Gravito's asynchronous ecosystem. It provides real-time visibility into your queues, workers, and background jobs, enabling powerful operational control with zero configuration.

## 🌟 Key Features

- **📊 Real-time Monitoring**: Visualize throughput, error rates, and queue latencies with live-updating charts.
- **👷 Worker Health**: Track CPU, RAM, and uptime for all active Gravito and Laravel workers in your cluster.
- **🛠️ Queue Management**: Pause/Resume queues and inspect jobs in Waiting, Delayed, or Failed states.
- **♻️ Dead Letter Queue (DLQ) Ops**: Batch retry or clear failed jobs directly from the UI with a single click.
- **🔍 Job Auditing & Search**: Deep search through historical jobs stored in SQL (SQLite/MySQL) or Redis.
- **📜 Operational Log Archiving**: Persistent storage and full-text search for worker activities and system events.
- **🚨 Automated Alerting**: Native integration with Slack, Discord, and Email for failure spikes or backlog thresholds.
- **📅 Schedule Management**: Full-featured UI to manage and trigger your `@gravito/stream` Cron jobs.

## 📦 Installation

```bash
bun add @gravito/zenith
```

Or run directly using `bunx`:

```bash
bunx zenith
```

## 🚀 Quick Start

### 1. Launch the Dashboard

You can start the console using the built-in CLI. It will automatically connect to your local Redis.

```bash
# Start on default port 3000
bunx zenith start

# Custom configuration via env vars
REDIS_URL=redis://production:6379 DB_DRIVER=mysql zenith start
```

### 2. Configure Monitoring

Register the **Pulse** agent in your Gravito application to report health metrics to Zenith.

```typescript
import { PlanetCore } from '@gravito/core'
import { OrbitStream } from '@gravito/stream'
import { QuasarAgent } from '@gravito/quasar' // Metrics reporter

const core = await PlanetCore.boot({
  orbits: [
    OrbitStream.configure({ /* ... */ }),
  ],
})

// Start reporting to Zenith
const agent = new QuasarAgent({ service: 'orders-worker' })
await agent.start()
```

## 🛠️ Configuration

| Env Var | Default | Description |
|---|---|---|
| `PORT` | `3000` | The port to run the dashboard on. |
| `REDIS_URL` | `redis://localhost:6379` | Connection string for your queue backend. |
| `DB_DRIVER` | `sqlite` | Persistence driver for job history (`sqlite` or `mysql`). |
| `AUTH_PASSWORD` | `none` | If set, enables password protection for the UI. |

## 🧩 Dashboard Sections

- **Overview**: High-level cluster health and job throughput.
- **Queues**: Detailed state of individual queues and job inspection.
- **Workers**: Live list of active process nodes and their resource usage.
- **Pulse**: Real-time heartbeat monitoring for all service instances.
- **Schedules**: Cron job definitions and execution history.
- **Metrics**: Long-term historical data for capacity planning.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](../../CONTRIBUTING.md) for details.

## 📄 License

MIT © Carl Lee
