import type { HookManager, Logger } from '@gravito/core'
import { CronParser } from './CronParser'
import type { LockManager } from './locks'
import { Process } from './process'
import { type ScheduledTask, TaskSchedule } from './TaskSchedule'

/**
 * Central registry and execution engine for scheduled tasks.
 *
 * Orchestrates the lifecycle of scheduled jobs by evaluating frequencies,
 * managing distributed locks to prevent duplicate execution, and handling
 * reliability features like retries and timeouts.
 *
 * Architecture Principles:
 * - Distributed Safety: Uses lock keys scoped to minute precision for global deduplication.
 * - Non-blocking: Executes tasks in parallel using fire-and-forget patterns.
 * - Observability: Emits granular lifecycle hooks for monitoring and alerting.
 *
 * @example
 * ```typescript
 * const scheduler = new SchedulerManager(lockManager, logger, hooks, 'worker');
 *
 * // Define a maintenance task
 * scheduler.task('daily-cleanup', async () => {
 *   await db.cleanup();
 * })
 * .dailyAt('03:00')
 * .onOneServer();
 * ```
 *
 * @public
 */
export class SchedulerManager {
  private tasks: TaskSchedule[] = []

  /**
   * Initializes the scheduler engine.
   *
   * @param lockManager - Backend for distributed locking.
   * @param logger - Optional logger for operational visibility.
   * @param hooks - Optional manager for lifecycle event hooks.
   * @param currentNodeRole - Role identifier for the local node (used for filtering).
   */
  constructor(
    public lockManager: LockManager,
    private logger?: Logger,
    private hooks?: HookManager,
    private currentNodeRole?: string
  ) {}

  /**
   * Registers a new callback-based scheduled task.
   *
   * @param name - Unique task name used for identification and locking.
   * @param callback - Asynchronous function containing the task logic.
   * @returns A fluent TaskSchedule instance for further configuration.
   *
   * @example
   * ```typescript
   * scheduler.task('process-queues', async () => {
   *   await queue.process();
   * }).everyMinute();
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
   * Executes the command via `sh -c` on matching nodes.
   *
   * @param name - Unique identifier for the command task.
   * @param command - Raw shell command string.
   * @returns A fluent TaskSchedule instance.
   * @throws {Error} If the shell command returns a non-zero exit code during execution.
   *
   * @example
   * ```typescript
   * scheduler.exec('log-rotate', 'logrotate /etc/logrotate.conf')
   *   .daily()
   *   .onNode('worker');
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
   * Injects a pre-configured TaskSchedule instance into the registry.
   *
   * @param schedule - Configured task schedule to register.
   */
  add(schedule: TaskSchedule) {
    this.tasks.push(schedule)
  }

  /**
   * Exports all registered tasks for external inspection or serialization.
   *
   * @returns An array of raw task configurations.
   */
  getTasks(): ScheduledTask[] {
    return this.tasks.map((t) => t.getTask())
  }

  /**
   * Main evaluation loop that triggers tasks due for execution.
   *
   * Should be invoked every minute by a system timer (systemd/cron) or daemon.
   * Performs frequency checks, role filtering, and parallel execution.
   *
   * @param date - Reference time for cron evaluation (default: current time).
   * @returns Resolves when all due tasks have been initiated.
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
      // Execute each task asynchronously to prevent blocking the main loop.
      // We catch internal errors to ensure one failing task doesn't crash the scheduler.
      this.runTask(task, date).catch((err) => {
        this.logger?.error(`[Scheduler] Unexpected error running task ${task.name}`, err)
      })
    }

    await this.hooks?.doAction('scheduler:run:complete', { date, dueCount: dueTasks.length })
  }

  /**
   * Executes an individual task after validating execution constraints.
   *
   * Evaluates node roles, overlapping prevention, and distributed time-window locks
   * before initiating the actual task logic.
   *
   * @param task - Target task configuration.
   * @param date - Reference time used for lock key generation.
   *
   * @internal
   */
  async runTask(task: ScheduledTask, date: Date = new Date()): Promise<void> {
    // Stage 1: Node Role Validation
    if (task.nodeRole && this.currentNodeRole && task.nodeRole !== this.currentNodeRole) {
      return
    }

    // Stage 2: Overlapping Prevention
    const runningLockKey = `task:running:${task.name}`

    if (task.preventOverlapping) {
      const isRunning = await this.lockManager.exists(runningLockKey)
      if (isRunning) {
        this.logger?.debug(
          `[Horizon] Task "${task.name}" is still running, skipping this execution`
        )
        await this.hooks?.doAction('scheduler:task:skipped', {
          name: task.name,
          reason: 'overlapping',
          timestamp: date,
        })
        return
      }

      // Acquire execution lock
      await this.lockManager.forceAcquire(runningLockKey, task.overlappingExpiresAt)
    }

    // Stage 3: Distributed Time-window Locking
    let acquiredTimeLock = false
    const timestamp = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}`
    const timeLockKey = `task:${task.name}:${timestamp}`

    if (task.shouldRunOnOneServer) {
      acquiredTimeLock = await this.lockManager.acquire(timeLockKey, task.lockTtl)

      if (!acquiredTimeLock) {
        // Rollback execution lock if time-window lock fails
        if (task.preventOverlapping) {
          await this.lockManager.release(runningLockKey)
        }
        return
      }
    }

    // Stage 4: Task Execution
    try {
      if (task.background) {
        this.executeTask(task)
          .catch((err): { success: boolean; timedOut: boolean } => {
            this.logger?.error(`Background task ${task.name} failed`, err)
            return { success: false, timedOut: false }
          })
          .then(async (result) => {
            // Release execution lock when background task finishes
            if (task.preventOverlapping && !result.timedOut) {
              await this.lockManager.release(runningLockKey)
            }
          })
      } else {
        const result = await this.executeTask(task)
        // Release execution lock when foreground task finishes
        if (task.preventOverlapping && !result.timedOut) {
          await this.lockManager.release(runningLockKey)
        }
      }
    } catch (err) {
      // Cleanup all locks on failure to allow subsequent attempts
      if (task.preventOverlapping) {
        await this.lockManager.release(runningLockKey)
      }
      if (acquiredTimeLock) {
        await this.lockManager.release(timeLockKey)
      }
      throw err
    }
  }

  /**
   * Internal wrapper for executing task logic with reliability controls.
   *
   * Handles timeouts, retries, and emits lifecycle hooks for monitoring.
   *
   * @param task - The scheduled task to execute.
   * @returns Resolves when the task (and its retries) completes or fails permanently.
   *
   * @internal
   */
  private async executeTask(task: ScheduledTask): Promise<{ success: boolean; timedOut: boolean }> {
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

        return { success: true, timedOut: false }
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

    return {
      success: false,
      timedOut: lastError?.message.includes('timed out after') ?? false,
    }
  }
}
