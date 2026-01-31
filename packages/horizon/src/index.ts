/**
 * @packageDocumentation
 * Enterprise-grade distributed task scheduler for the Gravito framework.
 *
 * This package provides a robust infrastructure for managing recurring jobs (Cron)
 * in a distributed environment. It features a fluent API for schedule definition,
 * pluggable locking mechanisms (Memory/Redis), node role filtering, and granular
 * monitoring via lifecycle hooks.
 *
 * Core Features:
 * - Distributed Locking: Prevents duplicate execution across multi-node clusters.
 * - Fluent API: Human-readable syntax for complex scheduling logic.
 * - Reliability: Built-in support for task timeouts and automatic retries.
 * - Cross-Runtime: Consistent behavior across Bun and Node.js environments.
 *
 * @example
 * Basic task registration:
 * ```typescript
 * import { OrbitHorizon } from '@gravito/horizon';
 *
 * // Registered via core orbits
 * scheduler.task('cleanup', async () => {
 *   await db.purge();
 * })
 * .dailyAt('02:00')
 * .onOneServer();
 * ```
 *
 * @example
 * Executing shell commands on specific nodes:
 * ```typescript
 * scheduler.exec('rotate-logs', 'logrotate -f /etc/logrotate.conf')
 *   .weekly()
 *   .onNode('worker');
 * ```
 */

export * from './CronParser'
export * from './locks'
export * from './OrbitHorizon'
export * from './process'
export * from './SchedulerManager'
export * from './TaskSchedule'
