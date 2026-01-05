# 🚀 Project Zenith: Laravel Integration Roadmap

**Repository**: `gravito-framework/laravel-zenith`
**Target Audience**: Laravel 10/11 Applications
**Goal**: Provide deep, native introspection into Laravel applications for Gravito Zenith.

---

## 1. Vision & Architecture

Unlike the **Quasar Agent** (which is a sidecar daemon for OS/Infrastructure monitoring), **Laravel Zenith** is a native Composer package that lives *inside* the application.

*   **Role**: " The Reporter". It sees what the OS cannot see.
*   **Transport**: Direct Redis connection (utilizing `swarrot` or standard `predis`/`phpredis`).
*   **Philosophy**: Zero-blocking. All reporting should be "fire-and-forget" or queued to avoid slowing down the user request lifecycle.

---

## 2. Core Features (The "Why")

### A. Live Operational Logs (`logs`)
*   **Feature**: A custom `Log Channel` driver.
*   **Goal**: Stream logs (Info/Error/Debug) directly to Zenith's Live Log view.
*   **Implementation**:
    *   `config/logging.php`: Add a `zenith` channel.
    *   Push JSON payloads to `flux_console:logs` Redis channel.

### B. Queue Lifecycle Events (`queues`)
*   **Feature**: Listen to Laravel Queue Events (`JobProcessing`, `JobProcessed`, `JobFailed`).
*   **Goal**: Provide granular job insight that `quasar-go` cannot (e.g., "Job X failed with Exception Y", "Job Z took 45s").
*   **Implementation**:
    *   Event Subscriber for `Illuminate\Queue\Events\*`.
    *   Capture `job->getRawBody()`, `exception->getMessage()`.

### C. Request Performance (`http`)
*   **Feature**: Global Middleware (`ZenithMonitorMiddleware`).
*   **Goal**: Track "Slow Requests", 500 Errors, and Throughput.
*   **Metrics**:
    *   Status Codes (2xx, 4xx, 5xx).
    *   Duration (ms).
    *   Route Name / Controller Action.

### D. System Health Checks
*   **Feature**: `php artisan zenith:check`
*   **Goal**: Verify Redis connection and permissions.

---

## 3. Implementation Roadmap

### Phase 1: The Foundation (Logs & Config)
**Goal**: Get the package installed and streaming basic logs.
- [ ] Initialize Repository `gravito-framework/laravel-zenith`.
- [ ] Create `ZenithServiceProvider`.
- [ ] Implement `ZenithLogger` (Monolog Handler).
- [ ] Publishing `config/zenith.php` (Redis connection settings).
- [ ] **Deliverable**: `Log::info('Hello Zenith')` appears in Zenith UI.

### Phase 2: The Worker's Eye (Queues)
**Goal**: Deep visibility into Queue Jobs.
- [ ] Create `ZenithQueueSubscriber`.
- [ ] Handle `JobFailed`: Serialize exception and push to Zenith Alerting.
- [ ] Handle `JobProcessed`: Record metrics for "Jobs per minute".
- [ ] **Deliverable**: Seeing real-time "Job Completed" toasts and Error details in Zenith.

### Phase 3: The Watchtower (HTTP & Exceptions)
**Goal**: Monitoring web requests.
- [ ] Create `RecordRequestMetrics` Middleware.
- [ ] Exception Handler integration (optional, for global error catching).
- [ ] Filter logic (ignore `/nova`, `/telescope`, etc.).
- [ ] **Deliverable**: HTTP Throughput graphs in Zenith.

### Phase 4: The Bridge (Remote Control Hooks)
**Goal**: Allow Zenith to trigger Laravel actions safely.
- [ ] Expose internal hooks for `quasar-go` to call?
    *   *Note*: `quasar-go` already calls `artisan`. Phase 4 might be about ensuring `artisan zenith:run-job {id}` exists if we need advanced job re-running that `queue:retry` can't handle.

---

## 4. Technical Specifications

### Redis Protocol
We will reuse the **Gravito Pulse Protocol (GPP)** used by `quasar-go`:
*   **Logs**: `PUBLISH flux_console:logs`
*   **Metrics**: `INCR flux_console:metrics:...`

### Configuration (`zenith.php`)
```php
return [
    'enabled' => env('ZENITH_ENABLED', true),
    
    'connection' => env('ZENITH_REDIS_CONNECTION', 'default'),
    
    'logging' => [
        'enabled' => true,
        'level' => 'debug',
    ],
    
    'queues' => [
        'monitor_all' => true,
        'ignore_jobs' => [],
    ],
];
```

### Dependency Strategy
*   **Support**: Laravel 10.x, 11.x
*   **Php**: 8.1+
*   **Driver**: `phpredis` (preferred) or `predis`.
