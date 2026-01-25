/**
 * @packageDocumentation
 * Enterprise-grade distributed task scheduler for Gravito framework.
 *
 * Provides fluent API for defining cron-based scheduled tasks with distributed locking,
 * node role targeting, retry mechanisms, and comprehensive monitoring hooks.
 *
 * @example
 * Basic task scheduling:
 * ```typescript
 * import { OrbitHorizon } from '@gravito/horizon'
 *
 * await PlanetCore.boot({
 *   config: {
 *     scheduler: {
 *       lock: { driver: 'cache' },
 *       nodeRole: 'worker'
 *     }
 *   },
 *   orbits: [OrbitHorizon]
 * })
 *
 * const scheduler = core.container.make('scheduler')
 * scheduler.task('daily-cleanup', async () => {
 *   await db.cleanup()
 * })
 * .daily()
 * .at('02:00')
 * .onOneServer() // Distributed lock
 * ```
 *
 * @example
 * Shell command execution with node targeting:
 * ```typescript
 * scheduler.exec('migrate', 'bun run db:migrate')
 *   .onNode('worker')
 *   .onOneServer()
 * ```
 */

export * from './CronParser'
export * from './locks'
export * from './OrbitHorizon'
export * from './process'
export * from './SchedulerManager'
export * from './TaskSchedule'
