# Quasar Agent - Monitoring Guide

## Overview
Quasar is a lightweight telemetry agent that runs alongside your application workers. It reports:
1.  **System Metrics**: CPU, Memory, Uptime.
2.  **Runtime Info**: Version, Platform, Language.
3.  **Queue Insights**: Local queue status (Waiting, Active, Delayed).

## Installation

```bash
npm install @gravito/quasar ioredis
```

## Basic Usage (Node.js Worker)

Simply start the agent alongside your worker process.

```typescript
import { QuasarAgent } from '@gravito/quasar'

// 1. Initialize Agent
const agent = new QuasarAgent({
  service: 'worker-orders', // Group Name
  name: 'worker-01',        // Unique Instance Name
  transport: {
    url: 'redis://zenith-server:6379' // Connection to Zenith
  }
})

// 2. Start (Heartbeat starts automatically)
await agent.start()
```

## Advanced: Dual Connection & Queue Monitoring

To monitor local queues (e.g., local BullMQ or Laravel Redis), you can provide a second `monitor` connection detailed queue insights.

### Monitoring Standard Redis Queues (e.g., Bull, Custom List)

```typescript
const agent = new QuasarAgent({
  service: 'worker-transcoder',
  
  // A. Transport: Where to send metrics?
  transport: { 
    url: 'redis://zenith-central:6379' 
  },
  
  // B. Monitor: Where to look for queues?
  monitor: { 
    url: 'redis://localhost:6379' 
  }
})

// Tell Quasar which queues to watch
agent.monitorQueue('video-transcoding', 'redis')
agent.monitorQueue('audio-processing', 'redis')

await agent.start()
```

### Monitoring Laravel Queues

If you are running a Node.js sidecar for a Laravel application (or using Gravito Stream with Laravel driver), you can monitor Laravel's queue structure:

```typescript
agent.monitorQueue('default', 'laravel')
agent.monitorQueue('emails', 'laravel')
```

This will automatically track:
- Waiting Jobs (`queues:default`)
- Active/Reserved Jobs (`queues:default:reserved`)
- Delayed Jobs (`queues:default:delayed`)

## Configuration Options

| Option | Type | Description | Default |
| :--- | :--- | :--- | :--- |
| `service` | `string` | **Required.** Service group name. | - |
| `name` | `string` | Unique instance ID. | `hostname + pid` |
| `transport` | `RedisConfig` | Connection for sending heartbeats. | `localhost:6379` |
| `monitor` | `RedisConfig` | Connection for inspecting queues. | `undefined` |
| `interval` | `number` | Heartbeat interval in ms. | `10000` (10s) |

---

## Remote Control (Phase 3)

Quasar agents can receive commands from Zenith to perform actions like retrying or deleting failed jobs. This enables **bidirectional communication** between your monitoring dashboard and distributed workers.

### Enabling Remote Control

```typescript
import { QuasarAgent } from '@gravito/quasar'

const agent = new QuasarAgent({
  service: 'worker-orders',
  transport: { url: 'redis://zenith-server:6379' },
  monitor: { url: 'redis://localhost:6379' }  // Required for command execution
})

agent.monitorQueue('orders', 'redis')

await agent.start()

// Enable remote control AFTER start (nodeId is required)
await agent.enableRemoteControl()
```

### Supported Commands

| Command | Description | Payload |
| :--- | :--- | :--- |
| `RETRY_JOB` | Retry a failed job (moves to waiting queue) | `queue`, `jobKey`, `driver` |
| `DELETE_JOB` | Permanently delete a job | `queue`, `jobKey`, `driver` |

### How It Works

```
┌──────────────┐   Pub/Sub   ┌──────────────┐
│    Zenith    │ ──────────▸ │ Quasar Agent │
│  (Dashboard) │             │   (Worker)   │
└──────────────┘             └──────────────┘
       │                            │
       │ POST /api/pulse/command    │ Executes on
       │ {type: 'RETRY_JOB', ...}   │ monitorRedis
       ▼                            ▼
```

1. User clicks "Retry" in Zenith UI
2. Zenith publishes command to `gravito:quasar:cmd:{service}:{node_id}`
3. Agent's `CommandListener` receives and validates the command
4. Agent's `CommandExecutor` performs the action on `monitorRedis`
5. Result is observed via job state changes (async feedback)

### Security

- **Allowlist**: Only `RETRY_JOB` and `DELETE_JOB` commands are allowed (hardcoded).
- **Node Targeting**: Commands include `targetNodeId` to prevent unintended execution.
- **Network Isolation**: Use VPC/network security to restrict Redis access.
- **API Auth**: Zenith's `/api/pulse/command` endpoint is protected by session auth.

---

**Security Note:**
For production environments, we recommend creating a dedicated Redis user (ACL) for the `transport` connection with minimal permissions (only `SET` for specific keys and `SUBSCRIBE` for the command channel).
