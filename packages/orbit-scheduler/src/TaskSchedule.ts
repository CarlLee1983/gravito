import type { ActionCallback } from 'gravito-core'

export interface ScheduledTask {
  name: string
  expression: string
  timezone: string
  callback: () => void | Promise<void>
  shouldRunOnOneServer: boolean
  lockTtl: number // seconds
  background: boolean

  onSuccessCallbacks: ActionCallback[]
  onFailureCallbacks: ActionCallback[]
}

/**
 * Fluent API for defining task schedules.
 *
 * @example
 * scheduler.task('backup')
 *   .daily()
 *   .at('02:00')
 *   .onOneServer()
 */
export class TaskSchedule {
  private task: ScheduledTask

  constructor(name: string, callback: () => void | Promise<void>) {
    this.task = {
      name,
      callback,
      expression: '* * * * *', // Default every minute
      timezone: 'UTC',
      shouldRunOnOneServer: false,
      lockTtl: 300, // 5 minutes default
      background: false, // Wait for task to finish by default
      onSuccessCallbacks: [],
      onFailureCallbacks: [],
    }
  }

  // --- Frequency Methods ---

  /**
   * Set a custom cron expression.
   *
   * @param expression - Standard cron expression (e.g., "* * * * *")
   */
  cron(expression: string): this {
    this.task.expression = expression
    return this
  }

  /**
   * Run the task every minute.
   */
  everyMinute(): this {
    return this.cron('* * * * *')
  }

  /**
   * Run the task every 5 minutes.
   */
  everyFiveMinutes(): this {
    return this.cron('*/5 * * * *')
  }

  /**
   * Run the task every 10 minutes.
   */
  everyTenMinutes(): this {
    return this.cron('*/10 * * * *')
  }

  /**
   * Run the task every 15 minutes.
   */
  everyFifteenMinutes(): this {
    return this.cron('*/15 * * * *')
  }

  /**
   * Run the task every 30 minutes.
   */
  everyThirtyMinutes(): this {
    return this.cron('0,30 * * * *')
  }

  /**
   * Run the task hourly (at minute 0).
   */
  hourly(): this {
    return this.cron('0 * * * *')
  }

  /**
   * Run the task hourly at a specific minute.
   *
   * @param minute - Minute (0-59)
   */
  hourlyAt(minute: number): this {
    return this.cron(`${minute} * * * *`)
  }

  /**
   * Run the task daily at midnight (00:00).
   */
  daily(): this {
    return this.cron('0 0 * * *')
  }

  /**
   * Run the task daily at a specific time.
   *
   * @param time - Time in "HH:mm" format (24h)
   */
  dailyAt(time: string): this {
    const [hour, minute] = time.split(':')
    return this.cron(`${Number(minute)} ${Number(hour)} * * *`)
  }

  /**
   * Run the task weekly on Sunday at midnight.
   */
  weekly(): this {
    return this.cron('0 0 * * 0')
  }

  /**
   * Run the task weekly on a specific day and time.
   *
   * @param day - Day of week (0-7, 0 or 7 is Sunday)
   * @param time - Time in "HH:mm" format (default "00:00")
   */
  weeklyOn(day: number, time = '00:00'): this {
    const [hour, minute] = time.split(':')
    return this.cron(`${Number(minute)} ${Number(hour)} * * ${day}`)
  }

  /**
   * Run the task monthly on the 1st day at midnight.
   */
  monthly(): this {
    return this.cron('0 0 1 * *')
  }

  /**
   * Run the task monthly on a specific day and time.
   *
   * @param day - Day of month (1-31)
   * @param time - Time in "HH:mm" format (default "00:00")
   */
  monthlyOn(day: number, time = '00:00'): this {
    const [hour, minute] = time.split(':')
    return this.cron(`${Number(minute)} ${Number(hour)} ${day} * *`)
  }

  // --- Constraints ---

  /**
   * Set the timezone for the task execution.
   *
   * @param timezone - Timezone identifier (e.g., "Asia/Taipei", "UTC")
   */
  timezone(timezone: string): this {
    this.task.timezone = timezone
    return this
  }

  /**
   * Set the time of execution for the current frequency.
   * Useful when chaining with daily(), weekly(), etc.
   *
   * @param time - Time in "HH:mm" format
   */
  at(time: string): this {
    const [hour, minute] = time.split(':')
    const parts = this.task.expression.split(' ')
    if (parts.length >= 5) {
      parts[0] = String(Number(minute))
      parts[1] = String(Number(hour))
      this.task.expression = parts.join(' ')
    }
    return this
  }

  /**
   * Ensure task runs on only one server at a time (Distributed Locking).
   * Requires a configured LockStore (Cache or Redis).
   *
   * @param lockTtlSeconds - Time in seconds to hold the lock (default 300)
   */
  onOneServer(lockTtlSeconds = 300): this {
    this.task.shouldRunOnOneServer = true
    this.task.lockTtl = lockTtlSeconds
    return this
  }

  /**
   * Alias for onOneServer.
   * Prevents overlapping executions of the same task.
   *
   * @param expiresAt - Lock TTL in seconds
   */
  withoutOverlapping(expiresAt = 300): this {
    return this.onOneServer(expiresAt)
  }

  /**
   * Run task in background (do not wait for completion in the loop).
   * Note: In Node.js non-blocking environment this is largely semantic,
   * but affects how we handle error catching and lock release.
   */
  runInBackground(): this {
    this.task.background = true
    return this
  }

  // --- Hooks ---

  /**
   * Register a callback to run on task success.
   */
  onSuccess(callback: ActionCallback): this {
    this.task.onSuccessCallbacks.push(callback)
    return this
  }

  /**
   * Register a callback to run on task failure.
   */
  onFailure(callback: ActionCallback): this {
    this.task.onFailureCallbacks.push(callback)
    return this
  }

  /**
   * Set a description for the task (useful for listing).
   */
  description(text: string): this {
    // Description logic if we want to store it (currently not in ScheduledTask interface but useful for CLI)
    // For now we just return this
    return this
  }

  // --- Accessor ---

  getTask(): ScheduledTask {
    return this.task
  }
}
