# Gravito Pulse Implementation Spec

## Overview
Gravito Pulse is a lightweight APM (Application Performance Monitoring) system integrated into Zenith. It follows the philosophy: *"If you can connect to Redis, you are monitored."*

## 1. Gravito Pulse Protocol (GPP)

### Data Structure
Pulse uses Redis keys with specific TTLs to represent live services.

- **Key Pattern**: `gravito:quasar:node:{service}:{node_id}`
- **TTL**: 30 seconds (Agents should heartbeat every 10-15s).
- **Data Type**: String (JSON)

### Payload Schema
```json
{
  "id": "string",          // Unique Instance ID (e.g., UUID or Hostname-PID)
  "service": "string",     // Group name (e.g., "worker-billing", "api-gateway")
  "language": "string",    // "node" | "bun" | "deno" | "php" | "go" | "python" | "other"
  "version": "string",     // Language/Runtime Version
  "pid": "number",         // Process ID
  "hostname": "string",    // Machine Hostname or Custom Name
  "platform": "string",    // OS Platform (linux, darwin, win32)
  "cpu": {
     "system": "number",   // System Load % (0-100)
     "process": "number",  // Process Usage % (0-100)
     "cores": "number"     // Core count
  },
  "memory": {
    "system": {
        "total": "number", // System Total Memory (bytes)
        "free": "number",  // System Free Memory (bytes)
        "used": "number"   // System Used Memory (bytes)
    },
    "process": {
        "rss": "number",      // Resident Set Size (bytes)
        "heapTotal": "number",// Heap Total (bytes)
        "heapUsed": "number"  // Heap Used (bytes)
    }
  },
  "runtime": {
    "uptime": "number",    // Process uptime in seconds
    "framework": "string"  // Optional framework info
  },
  "timestamp": "number"    // Unix Ms Timestamp
}
```

## 2. Implementation Modules

### A. Client SDK (`@gravito/pulse-node`)
A lightweight agent to collect metrics and publish to Redis.
- **Dependencies**: `ioredis`, `pidusage` (optional, or use native `os`/`process`).
- **Functionality**:
    - `startPulse({ service: string })`: Starts the heartbeat loop.
    - Collects CPU/RAM usage.
    - Publishes to Redis.

### B. Server Collector (Zenith Console)
- **Service**: `PulseService`
- **Method**: `getNodes()`
    - Performs `SCAN 0 MATCH pulse:* COUNT 100`.
    - Returns grouped nodes by `service`.
- **API**: `GET /api/pulse/nodes`

### C. Frontend Dashboard (Zenith UI)
- **Route**: `/pulse`
- **Components**:
    - `ServiceGroup`: A container for nodes of a specific service.
    - `NodeCard`: Displays CPU/RAM sparklines (optional) and current health.
    - `HealthBadge`: Green (Fresh), Yellow (>15s ago), Red (Dead/Gone - though Redis TTL handles removal, frontend can handle stale UI).

## 3. Alerts (Phase 2)
- Server-side checker that monitors values from `PulseService`.
- Triggers `AlertService` if:
    - CPU > 90% for 2 mins.
    - Memory > 90% for 5 mins.
    - Disk < 10% free.

## 4. Work Plan
1. **Define Types**: Add `PulseNode` interface to `@gravito/custom-types` or `flux-console` shared types.
2. **Implement Server Collector**: Create `PulseService` in `packages/flux-console/server/services`.
3. **Implement API**: Add route in `packages/flux-console/server/routes.ts`.
4. **Implement UI**: Create `PulsePage` and components.
5. **Implement Node Client**: Add `startPulse` to `packages/stream` (or separate package) to verify "dogfooding" by having the server monitor itself.
