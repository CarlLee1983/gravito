# @gravito/flux-console

Management and Monitoring UI for Gravito Stream.

## Features

- **Real-time Monitoring**: Throughput and error rates.
- **Worker Health**: Live CPU and RAM metrics.
- **Queue Management**: Pause/Resume queues, View Waiting/Delayed/Failed jobs.
- **DLQ Operations**: Batch retry or clear failed jobs directly from the UI.
- **Job Auditing & Search**: Permanent history via SQL (MySQL/SQLite) with global search.
- **Operational Log Archiving**: Persistent storage for system events and worker activities with history search.
- **Automated Alerting**: Slack notifications for failure spikes or backlog issues.
- **Batch Actions**: Flush delayed jobs, purge queues, and bulk operations.
- **Schedule Management**: Full UI for Cron jobs.
- **Zero-Config**: Built-in SQLite support for local auditing without a DB server.

## Development

```bash
# Start backend and frontend (proxy mode)
bun run dev

# Seed test data
bun scripts/seed-data.ts

# Start demo worker
bun scripts/demo-worker.ts
```

## Technical Specification

See [ARCHITECTURE.md](./ARCHITECTURE.md) and [DOCS_INTERNAL.md](./DOCS_INTERNAL.md) for implementation details.
