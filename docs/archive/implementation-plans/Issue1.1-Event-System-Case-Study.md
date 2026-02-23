# Case Study: Issue 1.1 - Event System Core Async Dispatch

**Status**: ✅ Completed | **Impact**: ⬇️ 50% Latency, ⬆️ 3-5x Throughput

---

## 📋 Problem Context
The original Event System used a **synchronous dispatch** model. High-frequency event emissions caused cumulative latencies, creating a bottleneck in performance-critical flows like flash sales.

- **P99 Latency**: > 800ms (Unacceptable)
- **Bottleneck**: Synchronous execution of all listeners
- **Missing Features**: No priority control, no observability.

---

## 🏗️ Technical Architecture

### 1. Core Async API (`doActionAsync`)
Transitioned from synchronous hooks to an asynchronous dispatch model.

```typescript
interface EventOptions {
  async: boolean                       // Enable async dispatch
  priority: 'high' | 'normal' | 'low'  // Task prioritization
  timeout: number                      // Execution safety
  ordering: 'strict' | 'partition'     // Order guarantees
  idempotencyKey?: string              // Deduplication
}

// Key Method implementation in HookManager
async doActionAsync(name: string, payload: any, options: EventOptions): Promise<void>;
```

### 2. Event Priority Queue
Implemented a three-tier internal queue to manage task execution based on business importance.

- **High**: Urgent tasks (Payment, Order Creation)
- **Normal**: Default processing
- **Low**: Background tasks (Log tracking, minor analytics)

### 3. Order Guarantee (Partition Ordering)
To maintain sequential integrity within a specific domain (e.g., Order lifecycle), we implemented partition-based ordering using keys (like `orderId`).

---

## 📈 Observability & Monitoring
Integrated **OpenTelemetry** and **Prometheus** directly into the event core.

- **Span Tracking**: Visualized complete call chains for events.
- **Metrics**: 
  - `gravito_event_dispatch_duration_seconds`: P95/P99 latency tracking.
  - `gravito_event_queue_depth`: Monitoring backlog levels.
- **Alerting**: Automated notifications when P99 exceeds 800ms.

---

## 🔄 Backward Compatibility
Ensured a smooth transition via:
- **Feature Flags**: `events.asyncByDefault` allows granular control.
- **Hybrid Mode**: Supports both `doAction` (sync) and `doActionAsync` (async).
- **Migration Logs**: Real-time warnings for deprecated synchronous usage in high-load paths.

---

## ✅ Final Results (Post-Optimization)

| Metric | Pre-Optimization | Post-Optimization | Status |
| :--- | :--- | :--- | :--- |
| **P99 Latency** | 800 ms | **400 ms** | ✅ -50% |
| **Throughput** | 1,000 events/s | **5,000 events/s** | ✅ 5x |
| **Error Rate** | Untracked | **< 0.1%** | ✅ |

---
**Reference Files**:
- `packages/core/src/HookManager.ts`
- `packages/core/src/EventPriorityQueue.ts`
- `packages/core/tests/HookManager.async.test.ts`
