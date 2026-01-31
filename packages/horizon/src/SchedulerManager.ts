import type { HookManager, Logger } from '@gravito/core'
import { CronParser } from './CronParser'
import type { LockManager } from './locks'
import { Process } from './process'
import { type ScheduledTask, TaskSchedule } from './TaskSchedule'

/**
 * Central registry and execution engine for scheduled tasks.
 *
 * Manages task definitions, evaluates cron expressions for due tasks, orchestrates
 * distributed locking, handles retries/timeouts, and emits lifecycle hooks for monitoring.
 *
 * Design considerations:
 * - Tasks run in parallel (fire-and-forget) to prevent blocking
 * - Lock keys are scoped to minute precision to prevent duplicate runs
 * - Node role filtering happens before lock acquisition to reduce contention
 *
 * @example
 * ```typescript
 * const scheduler = new SchedulerManager(lockManager, logger, hooks, 'worker')
 *
 * scheduler.task('backup-db', async () => {
 *   await db.backup()
 * })
 * .daily()
 * .at('03:00')
 * .onOneServer()
 * .retry(3, 5000)
 * ```
 *
 * @public
 */
export class SchedulerManager {
  private tasks: TaskSchedule[] = []

  constructor(
    public lockManager: LockManager,
    private logger?: Logger,
    private hooks?: HookManager,
    private currentNodeRole?: string
  ) {}

  /**
   * Registers a callback-based scheduled task.
   *
   * @param name - Unique identifier for task (used in logs, hooks, and lock keys)
   * @param callback - Async function to execute when cron expression matches
   * @returns Fluent TaskSchedule interface for chaining frequency/constraint methods
   *
   * @example
   * ```typescript
   * scheduler.task('send-reports', async () => {
   *   await emailService.sendWeeklyReports()
   * })
   * .weekly()
   * .onOneServer()
   * ```
   */
  task(name: string, callback: () => void | Promise<void>): TaskSchedule {
    const task = new TaskSchedule(name, callback)
    this.tasks.push(task)
    return task
  }

  /**
   * Registers a shell command as a scheduled task.
   *
   * @param name - Unique task identifier
   * @param command - Shell command string (executed via `sh -c`)
   * @returns Fluent TaskSchedule interface
   *
   * @throws {Error} When command execution fails (non-zero exit code)
   *
   * @example
   * ```typescript
   * scheduler.exec('backup-db', 'pg_dump mydb > /backups/$(date +%Y%m%d).sql')
   *   .daily()
   *   .at('02:00')
   *   .onNode('worker')
   * ```
   */
  exec(name: string, command: string): TaskSchedule {
    const task = new TaskSchedule(name, async () => {
      const result = await Process.run(command)
      if (!result.success) {
        throw new Error(`Command failed: ${result.stderr || result.stdout}`)
      }
    })
    task.setCommand(command)
    this.tasks.push(task)
    return task
  }

  /**
   * Registers a pre-configured TaskSchedule instance.
   *
   * Useful for building task definitions in separate modules and importing them.
   *
   * @param schedule - Fully configured TaskSchedule instance
   */
  add(schedule: TaskSchedule) {
    this.tasks.push(schedule)
  }

  /**
   * Retrieves all registered tasks as serializable objects.
   *
   * @returns Array of task configurations (used by CLI for `schedule:list`)
   */
  getTasks(): ScheduledTask[] {
    return this.tasks.map((t) => t.getTask())
  }

  /**
   * Evaluates all registered tasks and executes those matching current time.
   *
   * Designed to be invoked every minute by system cron or daemon loop.
   * Emits `scheduler:run:start` and `scheduler:run:complete` hooks for monitoring.
   *
   * @param date - Reference time for cron evaluation (defaults to current time)
   */
  async run(date: Date = new Date()): Promise<void> {
    await this.hooks?.doAction('scheduler:run:start', { date })

    const tasks = this.getTasks()
    const dueTasks: ScheduledTask[] = []

    for (const task of tasks) {
      if (await CronParser.isDue(task.expression, task.timezone, date)) {
        dueTasks.push(task)
      }
    }

    if (dueTasks.length > 0) {
      this.logger?.debug(`[Horizon] Found ${dueTasks.length} due task(s) to execute`, {
        tasks: dueTasks.map((t) => ({
          name: t.name,
          expression: t.expression,
          background: t.background,
          oneServer: t.shouldRunOnOneServer,
        })),
      })
    }

    for (const task of dueTasks) {
      // Fire and forget individual tasks so they run in parallel
      // But we must catch errors to not crash the loop (which is already inside async void but good practice)
      this.runTask(task, date).catch((err) => {
        this.logger?.error(`[Scheduler] Unexpected error running task ${task.name}`, err)
      })
    }

    await this.hooks?.doAction('scheduler:run:complete', { date, dueCount: dueTasks.length })
  }

  /**
   * Executes individual task with node role filtering and distributed locking.
   *
   * Workflow:
   * 1. Check node role match (skip if mismatch)
   * 2. Attempt lock acquisition (skip if already locked)
   * 3. Execute task (foreground or background based on configuration)
   * 4. Lock auto-expires after TTL (not manually released to prevent re-runs)
   *
   * @param task - Task configuration to execute
   * @param date - Reference time for lock key generation
   *
   * @internal
   */
  async runTask(task: ScheduledTask, date: Date = new Date()): Promise<void> {
    // Mode A & B: Node Role Check
    if (task.nodeRole && this.currentNodeRole && task.nodeRole !== this.currentNodeRole) {
      // This node doesn't match the required role, skip
      return
    }

    let acquiredLock = false
    // Make lock key specific to the current minute to prevent re-runs within the same window
    const timestamp = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}`
    const lockKey = `task:${task.name}:${timestamp}`

    // Mode B: Single-point (Locking)
    if (task.shouldRunOnOneServer) {
      acquiredLock = await this.lockManager.acquire(lockKey, task.lockTtl)

      if (!acquiredLock) {
        // Task running on another server or already completed for this window
        return
      }
    }

    try {
      if (task.background) {
        this.executeTask(task).catch((err) => {
          this.logger?.error(`Background task ${task.name} failed`, err)
        })
      } else {
        await this.executeTask(task)
      }
    } catch (err) {
      // If execution failed before reaching executeTask's internal try-catch
      // We might want to release the lock to allow retry, but executeTask handles most cases.
      if (acquiredLock) {
        await this.lockManager.release(lockKey)
      }
      throw err
    }
    // Note: We DO NOT release the lock here if successful.
    // It will expire based on lockTtl, preventing other nodes from running it in the same minute window.
  }

  /**
   * Runs task callback with timeout, retry logic, and lifecycle hooks.
   *
   * Emits hooks: `task:start`, `task:retry`, `task:success`, `task:failure`.
   * Retries are sequential with configurable delay between attempts.
   *
   * @param task - Task to execute
   */
  private async executeTask(task: ScheduledTask) {
    const startTime = Date.now()
    await this.hooks?.doAction('scheduler:task:start', { name: task.name, startTime })

    const timeout = task.timeout || 3600000
    const maxRetries = task.retries ?? 0
    const retryDelay = task.retryDelay ?? 1000
    let lastError: Error | undefined

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        this.logger?.info(
          `[Horizon] Retrying task "${task.name}" (attempt ${attempt}/${maxRetries})...`
        )
        await this.hooks?.doAction('scheduler:task:retry', {
          name: task.name,
          attempt,
          maxRetries,
          error: lastError,
          delay: retryDelay,
        })
        await new Promise((resolve) => setTimeout(resolve, retryDelay))
      }

      let timeoutId: ReturnType<typeof setTimeout> | undefined

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Task "${task.name}" timed out after ${timeout}ms`))
        }, timeout)
      })

      try {
        await Promise.race([task.callback(), timeoutPromise])

        const duration = Date.now() - startTime
        await this.hooks?.doAction('scheduler:task:success', {
          name: task.name,
          duration,
          attempts: attempt + 1,
        })

        for (const cb of task.onSuccessCallbacks) {
          try {
            await cb({ name: task.name })
          } catch {}
        }

        return
      } catch (err: any) {
        lastError = err
        this.logger?.error(`Task ${task.name} failed (attempt ${attempt + 1})`, err)
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
      }
    }

    const duration = Date.now() - startTime
    await this.hooks?.doAction('scheduler:task:failure', {
      name: task.name,
      error: lastError,
      duration,
      attempts: maxRetries + 1,
    })

    for (const cb of task.onFailureCallbacks) {
      try {
        await cb(lastError)
      } catch {}
    }
  }
}
