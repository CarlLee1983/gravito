export interface RetryOptions {
  maxAttempts: number
  baseDelay: number
  backoff: 'fixed' | 'linear' | 'exponential'
  maxDelay: number
  shouldRetry?: (error: Error, attempt: number) => boolean
  onRetry?: (error: Error, attempt: number, delay: number) => void
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000,
  backoff: 'exponential',
  maxDelay: 30000,
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options }
  let lastError: Error | undefined

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Check if should retry
      if (config.shouldRetry && !config.shouldRetry(lastError, attempt)) {
        throw lastError
      }

      // Do not retry on last attempt
      if (attempt === config.maxAttempts) {
        break
      }

      // Calculate delay
      const delay = calculateDelay(attempt, config)

      // Trigger retry callback
      config.onRetry?.(lastError, attempt, delay)

      // Wait
      await sleep(delay)
    }
  }

  throw lastError
}

function calculateDelay(attempt: number, config: RetryOptions): number {
  let delay: number

  switch (config.backoff) {
    case 'fixed':
      delay = config.baseDelay
      break
    case 'linear':
      delay = config.baseDelay * attempt
      break
    case 'exponential':
      delay = config.baseDelay * 2 ** (attempt - 1)
      break
  }

  // Add jitter
  const jitter = delay * 0.1 * Math.random()
  delay = delay + jitter

  return Math.min(delay, config.maxDelay)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase()

  // Network errors
  if (message.includes('network') || message.includes('timeout')) {
    return true
  }

  // Rate limit
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return true
  }

  // Transient service errors
  if (message.includes('503') || message.includes('service unavailable')) {
    return true
  }

  return false
}
