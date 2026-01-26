import type { Redis } from 'ioredis'

export type QueueDriver = 'bullmq' | 'bull' | 'bee-queue' | 'laravel' | 'redis'

/**
 * Command to retry a failed job.
 */
export interface RetryJobCommand {
  type: 'RETRY_JOB'
  id: string
  targetNodeId: string
  timestamp: number
  issuer: string
  payload: {
    queue: string
    jobId?: string
    jobKey?: string
    driver: QueueDriver
  }
}

/**
 * Command to delete a job.
 */
export interface DeleteJobCommand {
  type: 'DELETE_JOB'
  id: string
  targetNodeId: string
  timestamp: number
  issuer: string
  payload: {
    queue: string
    jobId?: string
    jobKey?: string
    driver: QueueDriver
  }
}

/**
 * Command to perform a Laravel-specific action.
 */
export interface LaravelActionCommand {
  type: 'LARAVEL_ACTION'
  id: string
  targetNodeId: string
  timestamp: number
  issuer: string
  payload: {
    queue: string
    action: string
    driver: 'laravel'
  }
}

export interface PauseQueueCommand {
  type: 'PAUSE_QUEUE'
  id: string
  targetNodeId: string
  timestamp: number
  issuer: string
  payload: {
    queue: string
    driver: QueueDriver
  }
}

export interface ResumeQueueCommand {
  type: 'RESUME_QUEUE'
  id: string
  targetNodeId: string
  timestamp: number
  issuer: string
  payload: {
    queue: string
    driver: QueueDriver
  }
}

export interface CleanQueueCommand {
  type: 'CLEAN_QUEUE'
  id: string
  targetNodeId: string
  timestamp: number
  issuer: string
  payload: {
    queue: string
    driver: QueueDriver
    status: 'completed' | 'failed' | 'delayed' | 'active' | 'wait' | 'paused'
    limit?: number
  }
}

export interface PrioritizeJobCommand {
  type: 'PRIORITIZE_JOB'
  id: string
  targetNodeId: string
  timestamp: number
  issuer: string
  payload: {
    queue: string
    jobId: string
    driver: QueueDriver
    priority: number
  }
}

/**
 * A command sent from Zenith to a Quasar agent for remote management.
 *
 * @public
 * @since 3.0.0
 */
export type QuasarCommand =
  | RetryJobCommand
  | DeleteJobCommand
  | LaravelActionCommand
  | PauseQueueCommand
  | ResumeQueueCommand
  | CleanQueueCommand
  | PrioritizeJobCommand

/**
 * Command types that Zenith can send to Quasar agents.
 */
export type CommandType = QuasarCommand['type']

/**
 * Result of a command execution on a Quasar agent.
 *
 * @public
 * @since 3.0.0
 */
export interface CommandResult {
  /** The ID of the command this result belongs to. */
  commandId: string
  /** The final status of the command. */
  status: 'success' | 'failed' | 'not_allowed'
  /** Optional error or success message. */
  message?: string
  /** Epoch timestamp when the command finished. */
  timestamp: number
}

/**
 * Interface for handling the execution of remote commands.
 *
 * @public
 * @since 3.0.0
 */
export interface CommandExecutor {
  /** The command type this executor handles. */
  readonly supportedType: CommandType
  /**
   * Execute the given command.
   *
   * @param command - The command to execute.
   * @param redis - Redis client for interacting with queues.
   * @returns The result of the execution.
   */
  execute(command: QuasarCommand, redis: Redis): Promise<CommandResult>
}
