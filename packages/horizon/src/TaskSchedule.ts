import type { ActionCallback } from '@gravito/core'
import { HorizonError } from './errors/HorizonError'
import { HorizonErrorCodes } from './errors/codes'
import {
  parseTime,
  validateDayOfMonth,
  validateDayOfWeek,
  validateMinute,
} from './utils/validation'

/**
 * Represents the configuration and state of a scheduled task.
 *
 * Encapsulates all metadata required by the scheduler to evaluate frequency,
 * manage distributed locking, and execute task logic with reliability controls.
 *
 * @public
 * @since 3.0.0
 */
export interface ScheduledTask {
  /**
   * Unique identifier for the task.
   * Used for logging, hook identification, and as part of the lock key.
   */
  name: string
  /**
   * Standard 5-part cron expression defining execution frequency.
   * Format: "minute hour day month weekday"
   */
  expression: string
  /**
   * Timezone identifier for evaluating the cron expression.
   * @defaultValue "UTC"
   */
  timezone: string
  /**
   * The asynchronous task logic to be executed.
   */
  callback: () => void | Promise<void>
  /**
   * Whether to ensure single-point execution across a distributed environment.
   * When true, uses a time-window lock to prevent multiple servers from running
   * the same task in the same scheduling window.
   */
  shouldRunOnOneServer: boolean
  /**
   * Duration in seconds to hold the distributed time-window lock.
   * @defaultValue 300
   */
  lockTtl: number
  /**
   * Whether to execute the task in a non-blocking background mode.
   * If true, the scheduler won't wait for completion before processing the next task.
   */
  background: boolean
  /**
   * Optional target node role required for execution.
   * Tasks will only run if the current node matches this role.
   */
  nodeRole?: string
  /**
   * Raw shell command if the task was created via `scheduler.exec()`.
   */
  command?: string
  /**
   * Maximum execution time in milliseconds before the task is aborted.
   * @defaultValue 3600000
   */
  timeout?: number
  /**
   * Number of times to retry a failed task.
   * @defaultValue 0
   */
  retries?: number
  /**
   * Delay between retry attempts in milliseconds.
   * @defaultValue 1000
   */
  retryDelay?: number

  /**
   * Whether to prevent concurrent executions of the same task.
   * If true, a new instance won't start if the previous one is still running.
   */
  preventOverlapping: boolean

  /**
   * Maximum duration in seconds for the execution lock.
   * Prevents deadlocks if a task crashes without releasing the lock.
   * @defaultValue 3600
   */
  overlappingExpiresAt: number

  /**
   * Collection of callbacks executed upon successful task completion.
   */
  onSuccessCallbacks: ActionCallback[]
  /**
   * Collection of callbacks executed when the task fails after all retries.
   */
  onFailureCallbacks: ActionCallback[]
}

/**
 * Fluent builder for defining and configuring scheduled tasks.
 *
 * Provides a human-readable API for setting execution frequency, constraints,
 * reliability settings, and lifecycle hooks.
 *
 * @example
 * ```typescript
 * scheduler.task('backup-db', async () => {
 *   await db.backup();
 * })
 * .dailyAt('03:00')
 * .onOneServer()
 * .withoutOverlapping()
 * .retry(3, 5000);
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class TaskSchedule {
  private task: ScheduledTask

  /**
   * Initializes a new schedule instance with default settings.
   *
   * @param name - Unique task name used for identification and locking.
   * @param callback - Logic to execute on schedule.
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
      preventOverlapping: false,
      overlappingExpiresAt: 3600, // 1 hour default
      onSuccessCallbacks: [],
      onFailureCallbacks: [],
    }
  }

  // --- Frequency Methods ---

  /**
   * Configures a raw 5-part cron expression.
   *
   * @param expression - Cron string (e.g., "0 0 * * *").
   * @returns The TaskSchedule instance for chaining.
   * @throws {Error} If expression format is invalid or contains forbidden characters.
   *
   * @example
   * ```typescript
   * schedule.cron('0 9-17 * * 1-5'); // 9-5 on weekdays
   * ```
   */
  cron(expression: string): this {
    const parts = expression.trim().split(/\s+/)

    if (parts.length !== 5) {
      throw new HorizonError(422, HorizonErrorCodes.CRON_PARSE_ERROR, {
        message:
          `Invalid cron expression: "${expression}". ` +
          `Expected 5 parts (minute hour day month weekday), got ${parts.length}.`,
      })
    }

    const pattern = /^[0-9,\-/*?L#A-Za-z]+$/

    for (let i = 0; i < 5; i++) {
      if (!pattern.test(parts[i])) {
        throw new HorizonError(422, HorizonErrorCodes.CRON_PARSE_ERROR, {
          message:
            `Invalid cron expression: "${expression}". ` +
            `Part ${i + 1} ("${parts[i]}") contains invalid characters.`,
        })
      }
    }

    this.task.expression = expression
    return this
  }

  /**
   * Schedules execution every minute.
   *
   * @returns The TaskSchedule instance for chaining.
   */
  everyMinute(): this {
    return this.cron('* * * * *')
  }

  /**
   * Schedules execution every five minutes.
   *
   * @returns The TaskSchedule instance for chaining.
   */
  everyFiveMinutes(): this {
    return this.cron('*/5 * * * *')
  }

  /**
   * Schedules execution every ten minutes.
   *
   * @returns The TaskSchedule instance for chaining.
   */
  everyTenMinutes(): this {
    return this.cron('*/10 * * * *')
  }

  /**
   * Schedules execution every fifteen minutes.
   *
   * @returns The TaskSchedule instance for chaining.
   */
  everyFifteenMinutes(): this {
    return this.cron('*/15 * * * *')
  }

  /**
   * Schedules execution every thirty minutes.
   *
   * @returns The TaskSchedule instance for chaining.
   */
  everyThirtyMinutes(): this {
    return this.cron('0,30 * * * *')
  }

  /**
   * Schedules execution hourly at the top of the hour.
   *
   * @returns The TaskSchedule instance for chaining.
   */
  hourly(): this {
    return this.cron('0 * * * *')
  }

  /**
   * Schedules execution hourly at a specific minute.
   *
   * @param minute - Target minute (0-59).
   * @returns The TaskSchedule instance for chaining.
   * @throws {Error} If minute is outside 0-59 range.
   */
  hourlyAt(minute: number): this {
    validateMinute(minute)
    return this.cron(`${minute} * * * *`)
  }

  /**
   * Schedules execution daily at midnight.
   *
   * @returns The TaskSchedule instance for chaining.
   */
  daily(): this {
    return this.cron('0 0 * * *')
  }

  /**
   * Schedules execution daily at a specific time.
   *
   * @param time - 24-hour time string in "HH:mm" format.
   * @returns The TaskSchedule instance for chaining.
   * @throws {Error} If time format is invalid or values are out of range.
   *
   * @example
   * ```typescript
   * schedule.dailyAt('14:30');
   * ```
   */
  dailyAt(time: string): this {
    const { hour, minute } = parseTime(time)
    return this.cron(`${minute} ${hour} * * *`)
  }

  /**
   * Schedules execution weekly on Sunday at midnight.
   *
   * @returns The TaskSchedule instance for chaining.
   */
  weekly(): this {
    return this.cron('0 0 * * 0')
  }

  /**
   * Schedules execution weekly on a specific day and time.
   *
   * @param day - Day index (0-6, where 0 is Sunday).
   * @param time - Optional 24-hour time string "HH:mm" (default "00:00").
   * @returns The TaskSchedule instance for chaining.
   * @throws {Error} If day index or time format is invalid.
   *
   * @example
   * ```typescript
   * schedule.weeklyOn(1, '09:00'); // Mondays at 9 AM
   * ```
   */
  weeklyOn(day: number, time = '00:00'): this {
    validateDayOfWeek(day)
    const { hour, minute } = parseTime(time)
    return this.cron(`${minute} ${hour} * * ${day}`)
  }

  /**
   * Schedules execution monthly on the first day at midnight.
   *
   * @returns The TaskSchedule instance for chaining.
   */
  monthly(): this {
    return this.cron('0 0 1 * *')
  }

  /**
   * Schedules execution monthly on a specific day and time.
   *
   * @param day - Day of month (1-31).
   * @param time - Optional 24-hour time string "HH:mm" (default "00:00").
   * @returns The TaskSchedule instance for chaining.
   * @throws {Error} If day or time format is invalid.
   */
  monthlyOn(day: number, time = '00:00'): this {
    validateDayOfMonth(day)
    const { hour, minute } = parseTime(time)
    return this.cron(`${minute} ${hour} ${day} * *`)
  }

  // --- Constraints ---

  /**
   * Specifies the timezone for evaluating schedule frequency.
   *
   * @param timezone - IANA timezone identifier (e.g., "America/New_York").
   * @returns The TaskSchedule instance for chaining.
   * @throws {Error} If the timezone identifier is not recognized by the system.
   */
  timezone(timezone: string): this {
    try {
      new Date().toLocaleString('en-US', { timeZone: timezone })
    } catch {
      throw new HorizonError(422, HorizonErrorCodes.INVALID_TIMEZONE, {
        message:
          `Invalid timezone: "${timezone}". ` +
          'See https://en.wikipedia.org/wiki/List_of_tz_database_time_zones for valid values.',
      })
    }
    this.task.timezone = timezone
    return this
  }

  /**
   * Modifies the execution time of the existing frequency.
   * Typically used after frequency methods like daily() or weekly().
   *
   * @param time - 24-hour time string in "HH:mm" format.
   * @returns The TaskSchedule instance for chaining.
   * @throws {Error} If time format is invalid.
   */
  at(time: string): this {
    const { hour, minute } = parseTime(time)
    const parts = this.task.expression.split(' ')
    if (parts.length >= 5) {
      parts[0] = String(minute)
      parts[1] = String(hour)
      this.task.expression = parts.join(' ')
    }
    return this
  }

  /**
   * Enables distributed locking to ensure only one instance runs globally.
   * Prevents duplicate execution when multiple servers are polling the same schedule.
   *
   * @param lockTtlSeconds - Duration in seconds to hold the window lock (default 300).
   * @returns The TaskSchedule instance for chaining.
   */
  onOneServer(lockTtlSeconds = 300): this {
    this.task.shouldRunOnOneServer = true
    this.task.lockTtl = lockTtlSeconds
    return this
  }

  /**
   * Prevents a new task instance from starting if the previous one is still running.
   *
   * Unlike `onOneServer()` which uses a time-window lock, this uses an execution lock
   * to handle long-running tasks that might span multiple scheduling intervals.
   *
   * @param expiresAt - Max duration in seconds to keep the execution lock (default 3600).
   * @returns The TaskSchedule instance for chaining.
   *
   * @example
   * ```typescript
   * // Prevents overlapping if the heavy operation takes > 1 minute
   * scheduler.task('data-sync', heavySync)
   *   .everyMinute()
   *   .withoutOverlapping();
   * ```
   */
  withoutOverlapping(expiresAt = 3600): this {
    this.task.preventOverlapping = true
    this.task.overlappingExpiresAt = expiresAt
    return this
  }

  /**
   * Executes the task in background mode.
   * The scheduler will not wait for this task to finish before proceeding to the next.
   *
   * @returns The TaskSchedule instance for chaining.
   */
  runInBackground(): this {
    this.task.background = true
    return this
  }

  /**
   * Restricts task execution to nodes with a specific role.
   *
   * @param role - Target role identifier (e.g., "worker").
   * @returns The TaskSchedule instance for chaining.
   */
  onNode(role: string): this {
    this.task.nodeRole = role
    return this
  }

  /**
   * Defines a maximum execution time for the task.
   *
   * @param ms - Timeout duration in milliseconds.
   * @returns The TaskSchedule instance for chaining.
   * @throws {Error} If timeout is not a positive number.
   */
  timeout(ms: number): this {
    if (ms <= 0) {
      throw new HorizonError(422, HorizonErrorCodes.INVALID_TIMEOUT, {
        message: 'Timeout must be a positive number',
      })
    }
    this.task.timeout = ms
    return this
  }

  /**
   * Configures automatic retry behavior for failed executions.
   *
   * @param attempts - Max number of retries (default 3).
   * @param delayMs - Wait time between retries in milliseconds (default 1000).
   * @returns The TaskSchedule instance for chaining.
   * @throws {Error} If attempts or delay are negative.
   */
  retry(attempts = 3, delayMs = 1000): this {
    if (attempts < 0) {
      throw new HorizonError(422, HorizonErrorCodes.INVALID_RETRY_ATTEMPTS, {
        message: 'Retry attempts must be non-negative',
      })
    }
    if (delayMs < 0) {
      throw new HorizonError(422, HorizonErrorCodes.INVALID_RETRY_DELAY, {
        message: 'Retry delay must be non-negative',
      })
    }
    this.task.retries = attempts
    this.task.retryDelay = delayMs
    return this
  }

  /**
   * Sets the shell command for execution-based tasks.
   *
   * @param command - The command string.
   * @returns The TaskSchedule instance for chaining.
   * @internal
   */
  setCommand(command: string): this {
    this.task.command = command
    return this
  }

  // --- Hooks ---

  /**
   * Registers a callback to execute upon successful task completion.
   *
   * @param callback - Function to run on success.
   * @returns The TaskSchedule instance for chaining.
   */
  onSuccess(callback: ActionCallback): this {
    this.task.onSuccessCallbacks.push(callback)
    return this
  }

  /**
   * Registers a callback to execute when the task fails.
   *
   * @param callback - Function to run on failure.
   * @returns The TaskSchedule instance for chaining.
   */
  onFailure(callback: ActionCallback): this {
    this.task.onFailureCallbacks.push(callback)
    return this
  }

  /**
   * Attaches a human-readable description to the task.
   *
   * @param _text - Description text.
   * @returns The TaskSchedule instance for chaining.
   */
  description(_text: string): this {
    return this
  }

  // --- Accessor ---

  /**
   * Returns the final task configuration.
   *
   * @returns The constructed ScheduledTask object.
   */
  getTask(): ScheduledTask {
    return this.task
  }
}
