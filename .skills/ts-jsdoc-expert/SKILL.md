---
name: ts-jsdoc-expert
description: Enhance JSDoc annotations for TypeScript code to optimize AI comprehension. Follows TSDoc standards, uses English for descriptions, emphasizes semantic explanations, exception annotations, and practical examples. Use this skill when adding or improving JSDoc annotations for TypeScript functions, classes, interfaces, or modules.
---

# TypeScript JSDoc Expert

Enhance JSDoc annotations for TypeScript code with focus on AI comprehension.

## Core Principles

1. **Semantic Priority** - Explain "why", not "what". Focus on design intent and use cases.
2. **Concise Annotations** - Don't repeat TypeScript types in `@param`/`@returns`. Describe purpose and behavior only.
3. **Exception Annotations** - Always include `@throws` with error types and trigger conditions.
4. **Practical Examples** - All exported functions must have `@example` blocks.
5. **TSDoc Standards** - Follow TSDoc syntax, write in English.

## Workflow

1. Identify exported functions, classes, interfaces needing annotations
2. Infer design intent from code logic
3. Write semantic descriptions (purpose, rationale, use cases)
4. Add `@param`/`@returns` (purpose only, no type repetition)
5. Add `@throws` for all error scenarios
6. Add `@example` for all exported functions
7. Return complete annotated code only

## Quick Templates

### Function

```typescript
/**
 * [Brief purpose]
 *
 * [Why needed, design intent, use cases]
 *
 * @param name - [Purpose, constraints]
 * @returns [Meaning, not type]
 * @throws {ErrorType} [Trigger conditions]
 *
 * @example
 * ```typescript
 * const result = myFunction(input);
 * ```
 */
```

### Class

```typescript
/**
 * [Brief description]
 *
 * [Design patterns, responsibilities]
 *
 * @example
 * ```typescript
 * const instance = new MyClass();
 * ```
 */
```

### Interface

```typescript
/**
 * [Brief description]
 *
 * [Contract purpose, implementation requirements]
 */
```

## Reference Resources

- **TSDoc Standards**: See `references/tsdoc-standards.md` for complete syntax specifications
- **Examples**: See `references/examples.md` for real-world annotation patterns
- **Best Practices**: See `references/best-practices.md` for advanced techniques

## Model Recommendation

| Task Complexity | Recommended Model |
|-----------------|-------------------|
| Simple functions, clear intent | **Haiku** - Fast, cost-effective |
| Complex classes, design patterns | **Sonnet** - Better semantic understanding |

Haiku handles 80% of JSDoc tasks effectively. Use Sonnet for code requiring deeper architectural reasoning.

## Output

Return only complete annotated code. No explanatory text.
