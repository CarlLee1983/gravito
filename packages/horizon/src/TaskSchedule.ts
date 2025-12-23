import type { ActionCallback } from 'gravito-core'

export interface ScheduledTask {
  name: string
  expression: string
  timezone: string
  callback: () => void | Promise<void>
  shouldRunOnOneServer: boolean
  lockTtl: number // seconds
  background: boolean
  nodeRole?: string
  command?: string

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

  /**
   * Create a new TaskSchedule instance.
   *
   * @param name - The unique name of the task.
   * @param callback - The function to execute.
   */
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
   * @returns The TaskSchedule instance.
   */
  cron(expression: string): this {
    this.task.expression = expression
    return this
  }

  /**
   * Run the task every minute.
   *
   * @returns The TaskSchedule instance.
   */
  everyMinute(): this {
    return this.cron('* * * * *')
  }

  /**
   * Run the task every 5 minutes.
   *
   * @returns The TaskSchedule instance.
   */
  everyFiveMinutes(): this {
    return this.cron('*/5 * * * *')
  }

  /**
   * Run the task every 10 minutes.
   *
   * @returns The TaskSchedule instance.
   */
  everyTenMinutes(): this {
    return this.cron('*/10 * * * *')
  }

  /**
   * Run the task every 15 minutes.
   *
   * @returns The TaskSchedule instance.
   */
  everyFifteenMinutes(): this {
    return this.cron('*/15 * * * *')
  }

  /**
   * Run the task every 30 minutes.
   *
   * @returns The TaskSchedule instance.
   */
  everyThirtyMinutes(): this {
    return this.cron('0,30 * * * *')
  }

  /**
   * Run the task hourly (at minute 0).
   *
   * @returns The TaskSchedule instance.
   */
  hourly(): this {
    return this.cron('0 * * * *')
  }

  /**
   * Run the task hourly at a specific minute.
   *
   * @param minute - Minute (0-59)
   * @returns The TaskSchedule instance.
   */
  hourlyAt(minute: number): this {
    return this.cron(`${minute} * * * *`)
  }

  /**
   * Run the task daily at midnight (00:00).
   *
   * @returns The TaskSchedule instance.
   */
  daily(): this {
    return this.cron('0 0 * * *')
  }

  /**
   * Run the task daily at a specific time.
   *
   * @param time - Time in "HH:mm" format (24h)
   * @returns The TaskSchedule instance.
   */
  dailyAt(time: string): this {
    const [hour, minute] = time.split(':')
    return this.cron(`${Number(minute)} ${Number(hour)} * * *`)
  }

  /**
   * Run the task weekly on Sunday at midnight.
   *
   * @returns The TaskSchedule instance.
   */
  weekly(): this {
    return this.cron('0 0 * * 0')
  }

  /**
   * Run the task weekly on a specific day and time.
   *
   * @param day - Day of week (0-7, 0 or 7 is Sunday)
   * @param time - Time in "HH:mm" format (default "00:00")
   * @returns The TaskSchedule instance.
   */
  weeklyOn(day: number, time = '00:00'): this {
    const [hour, minute] = time.split(':')
    return this.cron(`${Number(minute)} ${Number(hour)} * * ${day}`)
  }

  /**
   * Run the task monthly on the 1st day at midnight.
   *
   * @returns The TaskSchedule instance.
   */
  monthly(): this {
    return this.cron('0 0 1 * *')
  }

  /**
   * Run the task monthly on a specific day and time.
   *
   * @param day - Day of month (1-31)
   * @param time - Time in "HH:mm" format (default "00:00")
   * @returns The TaskSchedule instance.
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
   * @returns The TaskSchedule instance.
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
   * @returns The TaskSchedule instance.
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
   * @returns The TaskSchedule instance.
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
   * @returns The TaskSchedule instance.
   */
  withoutOverlapping(expiresAt = 300): this {
    return this.onOneServer(expiresAt)
  }

  /**
   * Run task in background (do not wait for completion in the loop).
   * Note: In Node.js non-blocking environment this is largely semantic,
   * but affects how we handle error catching and lock release.
   *
   * @returns The TaskSchedule instance.
   */
  runInBackground(): this {
    this.task.background = true
    return this
  }

  /**
   * Restrict task execution to a specific node role.
   *
   * @param role - The required node role (e.g., 'api', 'worker')
   * @returns The TaskSchedule instance.
   */
  onNode(role: string): this {
    this.task.nodeRole = role
    return this
  }

  /**
   * Set the command string for exec tasks.
   *
   * @param command - The command string.
   * @returns The TaskSchedule instance.
   * @internal
   */
  setCommand(command: string): this {
    this.task.command = command
    return this
  }

  // --- Hooks ---

  /**
   * Register a callback to run on task success.
   *
   * @param callback - The callback function.
   * @returns The TaskSchedule instance.
   */
  onSuccess(callback: ActionCallback): this {
    this.task.onSuccessCallbacks.push(callback)
    return this
  }

  /**
   * Register a callback to run on task failure.
   *
   * @param callback - The callback function.
   * @returns The TaskSchedule instance.
   */
  onFailure(callback: ActionCallback): this {
    this.task.onFailureCallbacks.push(callback)
    return this
  }

  /**
   * Set a description for the task (useful for listing).
   *
   * @param _text - The description text.
   * @returns The TaskSchedule instance.
   */
  description(_text: string): this {
    // Description logic if we want to store it (currently not in ScheduledTask interface but useful for CLI)
    // For now we just return this
    return this
  }

  // --- Accessor ---

  /**
   * Get the underlying task configuration.
   *
   * @returns The ScheduledTask object.
   */
  getTask(): ScheduledTask {
    return this.task
  }
}
