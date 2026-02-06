import { CronExpressionParser } from 'cron-parser'
import type { FluxEngine } from '../engine/FluxEngine'
import type { CronScheduleOptions } from '../types'

/**
 * Built-in scheduler for Flux workflows.
 *
 * Manages multiple cron-based schedules and triggers workflow execution
 * at the specified intervals.
 */
export class CronTrigger {
  private schedules = new Map<string, CronScheduleOptions>()
  private timers = new Map<string, Timer>()
  private running = false

  /**
   * Creates a new CronTrigger instance.
   *
   * @param engine - The Flux engine to use for executing scheduled workflows.
   */
  constructor(private engine: FluxEngine) {}

  /**
   * Starts the scheduler.
   */
  start(): void {
    if (this.running) {
      return
    }
    this.running = true
    this.refreshAll()
  }

  /**
   * Stops the scheduler and clears all timers.
   */
  stop(): void {
    this.running = false
    for (const timer of this.timers.values()) {
      clearTimeout(timer)
    }
    this.timers.clear()
  }

  /**
   * Adds a new schedule or updates an existing one.
   *
   * @param options - The schedule configuration.
   */
  addSchedule(options: CronScheduleOptions): void {
    this.schedules.set(options.id, options)
    if (this.running) {
      this.refreshSchedule(options.id)
    }
  }

  /**
   * Removes a schedule.
   *
   * @param id - The ID of the schedule to remove.
   */
  removeSchedule(id: string): void {
    this.schedules.delete(id)
    const timer = this.timers.get(id)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(id)
    }
  }

  /**
   * Refreshes all active schedules.
   * @private
   */
  private refreshAll(): void {
    for (const id of this.schedules.keys()) {
      this.refreshSchedule(id)
    }
  }

  /**
   * Calculates the next execution time and sets a timer for a specific schedule.
   *
   * @param id - The ID of the schedule to refresh.
   * @private
   */
  private refreshSchedule(id: string): void {
    const schedule = this.schedules.get(id)
    if (!schedule || schedule.enabled === false) {
      return
    }

    // Clear existing timer if any
    const existingTimer = this.timers.get(id)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    try {
      const interval = CronExpressionParser.parse(schedule.cron)
      const nextDate = interval.next().toDate()
      const delay = nextDate.getTime() - Date.now()

      if (delay <= 0) {
        // If the date is in the past (shouldn't happen with next()),
        // try again in a short while
        const timer = setTimeout(() => this.refreshSchedule(id), 1000)
        this.timers.set(id, timer)
        return
      }

      const timer = setTimeout(async () => {
        if (!this.running) {
          return
        }

        try {
          // Trigger the workflow
          await this.engine.execute(schedule.workflow as any, schedule.input)
        } catch (error) {
          console.error(`[CronTrigger] Failed to execute scheduled workflow "${id}":`, error)
        } finally {
          // Schedule the next run
          if (this.running && this.schedules.has(id)) {
            this.refreshSchedule(id)
          }
        }
      }, delay)

      this.timers.set(id, timer)
    } catch (error) {
      console.error(`[CronTrigger] Invalid cron expression for schedule "${id}":`, error)
    }
  }

  /**
   * Lists all registered schedules.
   * @returns An array of schedule configurations.
   */
  listSchedules(): CronScheduleOptions[] {
    return Array.from(this.schedules.values())
  }
}
