# Changelog

## [1.2.1] - 2026-01-26

### Added - Testing & Documentation Improvements

#### Testing
- **QuasarAgent**: Added lifecycle tests (`start`/`stop`), configuration validation, and monitor registration logic.
- **BullProbe**: Added comprehensive unit tests for Bull (v3/v4) statistics monitoring.
- **RedisListProbe**: Added unit tests for basic Redis list monitoring.
- **BeeQueueBridge**: Added unit tests for job event tracking.
- **InternalMetrics**: Added tests for internal performance tracking and Prometheus output.
- **Integration Tests**: Added `bridge-flow.test.ts` and `remote-control.test.ts` for end-to-end event and command verification.

#### Technical
- **MockRedis**: Enhanced test helper with Pub/Sub support, Pipeline execution logic, and case-insensitive command handling.
- **QuasarAgent**: Updated `enableRemoteControl` to support mock mode for easier testing.

#### Documentation
- **CONTRIBUTING.md**: Added new contribution guide with architecture overview and testing instructions.
- **Phase 4 Plan**: Updated progress tracking for testing milestones.

## [1.2.0]

### Minor Changes

- Implement several more examples and fix module issues, including:
  - Support middleware in core route definitions.
  - Improve Atlas driver loading and dependency injection.
  - Add PostgreSQL support to Ecommerce MVC example.
  - Fix internal type resolution issues across packages.

All notable changes to `@gravito/quasar` will be documented in this file.

## [1.1.0] - 2026-01-05

### Added - Queue Probes & Bridges (2026-01-05)

#### Queue Probes (Statistics Monitoring)

- **BullMQProbe**: Monitor BullMQ v5+ queue statistics
  - Tracks: `wait`, `active`, `delayed`, `failed` counts
  - Redis key structure: `{prefix}:{name}:{state}`
- **BeeQueueProbe**: Monitor Bee-Queue statistics
  - Tracks: `waiting`, `active`, `failed` counts
  - Redis key structure: `{prefix}:{name}:{state}`
- Updated `QuasarAgent.monitorQueue()` to support `'bullmq'` and `'bee-queue'` types
- Existing probes: `BullProbe` (Bull v3/v4), `LaravelProbe`, `RedisListProbe`

#### Bridges (Real-time Job Tracking)

- **BaseZenithBridge**: Abstract base class for all bridges
  - Handles Redis log publishing to `flux_console:logs`
  - Manages event listener lifecycle
  - Automatic cleanup on detach
- **BullMQBridge**: Real-time BullMQ worker monitoring
  - Events: `active`, `completed`, `failed`, `progress`
  - Captures job data, results, and error stack traces
- **BeeQueueBridge**: Real-time Bee-Queue monitoring
  - Events: `job succeeded`, `job failed`, `job progress`
  - Captures job data and error details
- **QuasarAgent.attachBridge()**: Easy bridge attachment method
  - Syntax: `agent.attachBridge(worker, 'bullmq')`
  - Automatic worker ID assignment
  - Lifecycle management

#### Documentation

- Added comprehensive `README.md` with:
  - Installation and quick start guides
  - Configuration reference
  - Architecture explanation (Probes vs Bridges)
  - TypeScript examples
- Added `BRIDGES.md` with detailed bridge usage examples
- Updated `package.json` description

#### Testing

- Added `BullMQProbe.test.ts` (3 tests, all passing)
- Added `BeeQueueProbe.test.ts` (4 tests, all passing)
- Added `BullMQBridge.test.ts` (4 tests, all passing)
- Total: 11 new tests, 100% passing

### Technical Details

#### Dual Monitoring Architecture

```
┌─────────────────────────────────────────┐
│ Application                             │
│                                         │
│  ┌──────────┐         ┌──────────┐     │
│  │  Probe   │         │  Bridge  │     │
│  │ (Stats)  │         │  (Logs)  │     │
│  └────┬─────┘         └────┬─────┘     │
│       │ Scan Redis         │ Hook       │
│       │ Every 10s          │ Events     │
└───────┼────────────────────┼───────────┘
        │                    │
        ▼                    ▼
   ┌─────────────────────────────┐
   │ Redis (Gravito Pulse)       │
   │ - flux_console:logs         │
   │ - gravito:quasar:node:*     │
   └─────────────────────────────┘
```

#### Breaking Changes

None. All changes are additive and backward compatible.

## [1.0.0] - Previous Release

Initial release with:

- System metrics monitoring (CPU, memory, process)
- Basic queue probes (Bull v3/v4, Laravel, Redis)
- Remote control capabilities
- Command execution (retry, delete jobs)
