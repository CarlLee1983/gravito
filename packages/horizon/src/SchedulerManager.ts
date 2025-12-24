import type { HookManager, Logger } from 'gravito-core'
import { CronParser } from './CronParser'
import type { LockManager } from './locks'
import { Process } from './process'
import { type ScheduledTask, TaskSchedule } from './TaskSchedule'

/**
 * Core Scheduler Manager responsible for managing and executing tasks.
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
   * Define a new scheduled task.
   *
   * @param name - Unique name for the task
   * @param callback - Function to execute
   * @returns The newly created TaskSchedule.
   */
  task(name: string, callback: () => void | Promise<void>): TaskSchedule {
    const task = new TaskSchedule(name, callback)
    this.tasks.push(task)
    return task
  }

  /**
   * Define a new scheduled command execution task.
   *
   * @param name - Unique name for the task
   * @param command - Shell command to execute
   * @returns The newly created TaskSchedule.
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
   * Add a pre-configured task schedule object.
   *
   * @param schedule - The task schedule to add.
   */
  add(schedule: TaskSchedule) {
    this.tasks.push(schedule)
  }

  /**
   * Get all registered task definitions.
   *
   * @returns An array of scheduled tasks.
   */
  getTasks(): ScheduledTask[] {
    return this.tasks.map((t) => t.getTask())
  }

  /**
   * Trigger the scheduler to check and run due tasks.
   * This is typically called every minute by a system cron or worker loop.
   *
   * @param date - The current reference date (default: now)
   * @returns A promise that resolves when the scheduler run is complete.
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
      // Log found tasks?
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
   * Execute a specific task with locking logic.
   *
   * @param task - The task to execute.
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
   * Execute the task callback and handle hooks.
   *
   * @param task - The task to execute.
   */
  private async executeTask(task: ScheduledTask) {
    const startTime = Date.now()
    await this.hooks?.doAction('scheduler:task:start', { name: task.name, startTime })

    try {
      await task.callback()

      const duration = Date.now() - startTime
      await this.hooks?.doAction('scheduler:task:success', { name: task.name, duration })

      for (const cb of task.onSuccessCallbacks) {
        try {
          await cb({ name: task.name })
        } catch {}
      }
    } catch (err: any) {
      const duration = Date.now() - startTime
      this.logger?.error(`Task ${task.name} failed`, err)

      await this.hooks?.doAction('scheduler:task:failure', {
        name: task.name,
        error: err,
        duration,
      })

      for (const cb of task.onFailureCallbacks) {
        try {
          await cb(err)
        } catch {}
      }
      // We don't rethrow here to ensure cleanup happens in runTask
    }
  }
}
