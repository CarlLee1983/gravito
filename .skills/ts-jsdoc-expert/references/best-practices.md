# JSDoc Best Practices

## Table of Contents

- [Semantic Over Syntactic](#semantic-over-syntactic)
- [Exception Documentation](#exception-documentation)
- [Examples That Teach](#examples-that-teach)
- [Common Pitfalls](#common-pitfalls)
- [AI Comprehension Tips](#ai-comprehension-tips)

---

## Semantic Over Syntactic

### Bad: Repeating What Code Shows

```typescript
/**
 * @param name - The name string
 * @param age - The age number
 * @returns A User object
 */
function createUser(name: string, age: number): User
```

### Good: Explaining Intent

```typescript
/**
 * Creates a new user with validation and default preferences.
 *
 * Used during registration flow. Validates name format and
 * age constraints before creating the user record.
 *
 * @param name - Display name (2-50 chars, no special characters)
 * @param age - Must be 13+ for COPPA compliance
 * @returns User with initialized preferences and timestamps
 */
function createUser(name: string, age: number): User
```

**Key difference:** Explain constraints, business rules, and "why" instead of restating types.

---

## Exception Documentation

### Document All Thrown Errors

```typescript
/**
 * @throws {ValidationError} When input fails format validation
 * @throws {NotFoundError} When referenced entity doesn't exist
 * @throws {PermissionError} When caller lacks required access
 * @throws {NetworkError} When external service is unreachable
 */
```

### Include Trigger Conditions

```typescript
// Bad: What error
@throws {Error} When something goes wrong

// Good: When and why
@throws {RateLimitError} When more than 100 requests made within 1 minute
```

### Document Propagated Errors

```typescript
/**
 * @throws {DatabaseError} Propagated from underlying storage layer
 */
```

---

## Examples That Teach

### Show Typical Usage

```typescript
/**
 * @example
 * ```typescript
 * // Basic usage
 * const result = transform(input);
 * ```
 */
```

### Show Edge Cases

```typescript
/**
 * @example
 * ```typescript
 * // Handles empty input gracefully
 * transform([]) // => []
 *
 * // Preserves order for duplicate keys
 * transform([{k:1}, {k:1}]) // => [{k:1}, {k:1}]
 * ```
 */
```

### Show Error Handling

```typescript
/**
 * @example
 * ```typescript
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   if (error instanceof RetryableError) {
 *     await delay(1000);
 *     return riskyOperation(); // Safe to retry
 *   }
 *   throw error; // Non-retryable, propagate
 * }
 * ```
 */
```

---

## Common Pitfalls

### Pitfall 1: Over-Documentation

```typescript
// Too verbose - wastes tokens, adds no value
/**
 * This function is used to get the user by their ID.
 * It takes a user ID as a parameter and returns the user.
 * The user ID should be a valid string identifier.
 * If the user is found, it will be returned.
 * If not found, null will be returned.
 *
 * @param userId - The ID of the user to get
 * @returns The user or null
 */
function getUser(userId: string): User | null

// Concise and informative
/**
 * Retrieves user with populated relations.
 *
 * @param userId - Unique identifier (uuid format)
 * @returns User with profile and preferences, null if not found
 */
function getUser(userId: string): User | null
```

### Pitfall 2: Stale Examples

Keep examples synchronized with actual API:

```typescript
// Bad: Example uses old API
/**
 * @example
 * ```typescript
 * const result = oldMethod(x, y, z); // API changed!
 * ```
 */
function newMethod(config: Config): Result
```

### Pitfall 3: Missing Context

```typescript
// Bad: No context
/**
 * Processes the data.
 */

// Good: Clear context
/**
 * Transforms raw analytics events into aggregated metrics.
 *
 * Called by the metrics pipeline after event deduplication.
 * Output feeds into the reporting dashboard.
 */
```

---

## AI Comprehension Tips

### Use Consistent Terminology

Pick one term and stick with it:
- "user" vs "account" vs "member"
- "create" vs "add" vs "insert"
- "remove" vs "delete" vs "destroy"

### State Invariants Explicitly

```typescript
/**
 * @remarks
 * Invariants:
 * - Output array length always equals input length
 * - Elements maintain relative order
 * - Null inputs produce empty outputs
 */
```

### Describe State Changes

```typescript
/**
 * Marks order as shipped and triggers notification.
 *
 * Side effects:
 * - Updates order.status to 'shipped'
 * - Sends email notification to customer
 * - Logs shipping event to audit trail
 */
```

### Link Related Functions

```typescript
/**
 * Encodes data for transmission.
 *
 * @see {@link decode} for the inverse operation
 * @see {@link validate} to verify before encoding
 */
```

### Clarify Async Behavior

```typescript
/**
 * Initiates background sync without blocking.
 *
 * Returns immediately after queueing. Use `onComplete` callback
 * or poll `getSyncStatus()` to track progress.
 */
```
