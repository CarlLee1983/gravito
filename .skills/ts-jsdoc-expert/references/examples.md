# JSDoc Examples Collection

## Table of Contents

- [Async Functions](#async-functions)
- [Generic Functions](#generic-functions)
- [Class with Lifecycle](#class-with-lifecycle)
- [Factory Pattern](#factory-pattern)
- [Options Object Pattern](#options-object-pattern)
- [Error Handling Pattern](#error-handling-pattern)

---

## Async Functions

```typescript
/**
 * Fetches user data with automatic retry on transient failures.
 *
 * Implements exponential backoff to handle rate limiting and temporary
 * network issues without overwhelming the server.
 *
 * @param userId - Unique identifier for the target user
 * @param options - Fetch behavior configuration
 * @returns User data with computed profile completeness score
 * @throws {NotFoundError} When user doesn't exist in the system
 * @throws {RateLimitError} When retry attempts exhausted
 *
 * @example
 * ```typescript
 * const user = await fetchUser('usr_123', { timeout: 5000 });
 * console.log(user.profile.completeness); // 0.85
 * ```
 */
async function fetchUser(
  userId: string,
  options?: FetchOptions
): Promise<UserWithScore> {
  // implementation
}
```

---

## Generic Functions

```typescript
/**
 * Groups array elements by a computed key, preserving insertion order.
 *
 * Unlike Object.groupBy, maintains the order elements were first seen
 * for each group, which is critical for time-series data processing.
 *
 * @typeParam T - The type of elements being grouped
 * @typeParam K - The grouping key type (must be usable as object key)
 * @param items - Elements to group
 * @param keyFn - Extracts grouping key from each element
 * @returns Map preserving insertion order within each group
 *
 * @example
 * ```typescript
 * const events = [
 *   { type: 'click', ts: 1 },
 *   { type: 'scroll', ts: 2 },
 *   { type: 'click', ts: 3 }
 * ];
 * const grouped = groupBy(events, e => e.type);
 * // Map { 'click' => [{ts:1}, {ts:3}], 'scroll' => [{ts:2}] }
 * ```
 */
function groupBy<T, K extends PropertyKey>(
  items: T[],
  keyFn: (item: T) => K
): Map<K, T[]> {
  // implementation
}
```

---

## Class with Lifecycle

```typescript
/**
 * Manages WebSocket connections with automatic reconnection.
 *
 * Handles connection lifecycle including heartbeat monitoring,
 * reconnection with exponential backoff, and message queueing
 * during disconnected periods.
 *
 * @example
 * ```typescript
 * const socket = new ManagedSocket('wss://api.example.com');
 * socket.on('message', data => console.log(data));
 * await socket.connect();
 * socket.send({ type: 'subscribe', channel: 'updates' });
 * ```
 */
export class ManagedSocket {
  /**
   * Establishes connection and begins heartbeat monitoring.
   *
   * Safe to call multiple times; subsequent calls are no-op if
   * already connected or connecting.
   *
   * @throws {ConnectionError} When server rejects the connection
   * @throws {TimeoutError} When connection handshake exceeds timeout
   */
  async connect(): Promise<void> {
    // implementation
  }

  /**
   * Queues message for delivery, sending immediately if connected.
   *
   * Messages queued during disconnection are sent in order upon
   * reconnection, with automatic retry for failed deliveries.
   *
   * @param payload - Data to send (will be JSON serialized)
   * @throws {PayloadTooLargeError} When serialized size exceeds limit
   */
  send(payload: unknown): void {
    // implementation
  }
}
```

---

## Factory Pattern

```typescript
/**
 * Creates a configured logger instance for the specified module.
 *
 * Centralizes logging configuration to ensure consistent formatting,
 * appropriate log levels per environment, and proper log routing.
 *
 * @param moduleName - Identifies log source in output
 * @param options - Override default configuration
 * @returns Configured logger with bound module context
 *
 * @example
 * ```typescript
 * const log = createLogger('auth-service');
 * log.info('User authenticated', { userId: 'usr_123' });
 * // [2024-01-15T10:30:00Z] INFO [auth-service] User authenticated {"userId":"usr_123"}
 * ```
 */
function createLogger(
  moduleName: string,
  options?: LoggerOptions
): Logger {
  // implementation
}
```

---

## Options Object Pattern

```typescript
/**
 * Configuration for the retry mechanism.
 */
interface RetryOptions {
  /**
   * Maximum retry attempts before giving up.
   * Set to 0 to disable retries entirely.
   */
  maxAttempts: number;

  /**
   * Initial delay between retries in milliseconds.
   * Subsequent delays are multiplied by `backoffFactor`.
   */
  initialDelay: number;

  /**
   * Multiplier applied to delay after each failed attempt.
   * Use 1 for constant delay, 2 for exponential backoff.
   */
  backoffFactor: number;

  /**
   * Determines if an error should trigger a retry.
   * Return false to fail immediately on certain errors.
   */
  shouldRetry?: (error: Error) => boolean;
}
```

---

## Error Handling Pattern

```typescript
/**
 * Parses and validates configuration from multiple sources.
 *
 * Merges configuration with precedence: env vars > file > defaults.
 * Validates the final merged config against the schema.
 *
 * @param configPath - Path to JSON/YAML config file
 * @returns Validated and type-safe configuration object
 * @throws {ConfigFileError} When file cannot be read or parsed
 * @throws {ValidationError} When merged config fails schema validation
 * @throws {EnvironmentError} When required env vars are missing
 *
 * @example
 * ```typescript
 * try {
 *   const config = loadConfig('./config.yaml');
 *   startServer(config);
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     console.error('Invalid config:', error.issues);
 *     process.exit(1);
 *   }
 *   throw error;
 * }
 * ```
 */
function loadConfig(configPath: string): AppConfig {
  // implementation
}
```
