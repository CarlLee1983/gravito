# TSDoc Standards Reference

## Table of Contents

- [Block Tags](#block-tags)
- [Inline Tags](#inline-tags)
- [Modifier Tags](#modifier-tags)
- [Tag Usage Rules](#tag-usage-rules)

---

## Block Tags

### @param

```typescript
/**
 * @param name - Description of the parameter's purpose
 * @param options - Configuration affecting behavior
 * @param options.timeout - Maximum wait time before giving up
 */
```

**Rules:**
- Use hyphen-minus separator: `@param name - description`
- Don't repeat type info (TypeScript provides it)
- Describe purpose, constraints, and side effects

### @returns

```typescript
/**
 * @returns The resolved configuration merged with defaults
 */
```

**Rules:**
- Omit when return type is `void`
- Describe meaning, not type
- Explain what the value represents

### @throws

```typescript
/**
 * @throws {ValidationError} When input fails schema validation
 * @throws {NetworkError} When connection times out
 */
```

**Rules:**
- Always include error type in braces
- Describe trigger conditions
- List all possible error scenarios

### @example

```typescript
/**
 * @example
 * ```typescript
 * // Basic usage
 * const result = parse('{"key": "value"}');
 * console.log(result.key); // "value"
 * ```
 *
 * @example
 * ```typescript
 * // With options
 * const result = parse(input, { strict: true });
 * ```
 */
```

**Rules:**
- Use fenced code blocks with language identifier
- Show typical usage scenarios
- Include expected output when helpful

### @typeParam

```typescript
/**
 * @typeParam T - The type of elements in the collection
 * @typeParam K - The key type for lookups
 */
```

### @defaultValue

```typescript
/**
 * @defaultValue `false`
 */
enabled?: boolean;
```

---

## Inline Tags

### @link

```typescript
/**
 * Similar to {@link Array.map} but with async support.
 * See {@link https://example.com | documentation} for details.
 */
```

### @inheritDoc

```typescript
/**
 * {@inheritDoc BaseClass.method}
 */
```

---

## Modifier Tags

| Tag | Purpose |
|-----|---------|
| `@public` | Part of public API |
| `@internal` | Internal implementation detail |
| `@deprecated` | Scheduled for removal |
| `@readonly` | Should not be modified |
| `@sealed` | Not for inheritance |
| `@virtual` | Can be overridden |
| `@override` | Overrides base class |

### @deprecated Example

```typescript
/**
 * @deprecated Use {@link newMethod} instead. Will be removed in v3.0.
 */
```

---

## Tag Usage Rules

### Order Convention

1. Description (brief + detailed)
2. `@typeParam`
3. `@param`
4. `@returns`
5. `@throws`
6. `@example`
7. Modifier tags (`@public`, `@deprecated`, etc.)

### Summary vs Description

```typescript
/**
 * Brief summary on first line.
 *
 * Detailed explanation starts after blank line.
 * Can span multiple paragraphs.
 *
 * @remarks
 * Additional context for API documentation tools.
 */
```

### Multi-line Descriptions

```typescript
/**
 * @param config - The configuration object containing:
 *   - `timeout`: Maximum wait time in milliseconds
 *   - `retries`: Number of retry attempts
 *   - `onError`: Callback for error handling
 */
```
