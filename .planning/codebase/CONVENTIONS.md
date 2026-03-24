# Coding Conventions

**Analysis Date:** 2026-03-24

## Naming Patterns

**Files:**
- PascalCase for classes and main exports: `Container.ts`, `EventManager.ts`, `QueryBuilder.ts`, `GravitoException.ts`
- camelCase for utilities and helper modules: `helpers.ts`, `compat.ts`, `path.ts`, `pool.ts`
- __tests__ directory for engine/native code tests: `packages/core/src/engine/__tests__/`
- tests/ directory at package root for unit/integration tests: `packages/core/tests/`

**Functions:**
- camelCase for all function names: `getRequest()`, `storeRequest()`, `prune()`, `listen()`, `dispatch()`
- Setters use `set` prefix: `setBroadcastManager()`, `setQueueManager()`
- Getters use `get` prefix: `getRequest()`, `getRequests()`, `getLocalizedMessage()`
- Factories use `create` prefix or descriptive names: `createMockConnection()`, `bind()`, `singleton()`

**Variables:**
- camelCase for all variables: `eventKey`, `listeners`, `resolutionStack`, `sentMessages`, `broadcastManager`
- Private properties with underscore prefix (convention observed in Container patterns): No strict prefix, but private access via property declaration
- Descriptive names for collections: `listeners`, `bindings`, `instances`, `sentMessages`, `queryString`

**Types:**
- PascalCase for interfaces and types: `Logger`, `Factory<T>`, `Binding<T>`, `Transport`, `Message`, `ConnectionContract`
- Suffix with "Options" for configuration objects: `ExceptionOptions`, `EventOptions`, `AdapterConfig`
- Suffix with "Request"/"Response" for HTTP types: `GravitoRequest`, `GravitoResponse`
- Suffix with "Contract" for abstract contracts: `ConnectionContract`, `DriverContract`, `QueryResult`
- Prefix "I" for protocol/interface types (not consistently used, but appears in some modules): `IXxxMessages` pattern used in service layer

## Code Style

**Formatting:**
- Biome configuration in `/Users/carl/Dev/Carl/gravito-core/biome.json`
- Line width: 100 characters maximum
- Indentation: 2 spaces
- Line ending: LF only

**Linting:**
- Biome (replaces ESLint) with strict configuration
- Recommended rules enabled across all categories
- Key enforced rules:
  - `noUnusedVariables: error` - All variables must be used
  - `noUnusedLabels: error` - No unused labels
  - `useConst: error` - Prefer const over let
  - `noExplicitAny: warn` - Minimize any types (error in GraphQL overrides)
  - `useOptionalChain: error` - Prefer optional chaining
  - `useFlatMap: error` - Use flatMap instead of map+flat
  - `noCommentText: error` - Comments must be meaningful
  - `noDangerouslySetInnerHtml: error` - Security-focused

**Formatting Settings:**
- Quote style: Single quotes for JavaScript
- Trailing commas: ES5 style (last item includes comma)
- Semicolons: Omit when not needed (asNeeded)
- Arrow function parentheses: Always include
- JSX quotes: Double quotes

## Import Organization

**Order:**
1. Node.js built-ins: `import { fileURLToPath } from 'node:url'`
2. Third-party packages: `import { describe, expect, it } from 'bun:test'`
3. Type imports: `import type { ConnectionContract } from '../src/types'`
4. Local relative imports: `import { Container } from '../src'`
5. Local type imports at end: `import type { ServiceMap } from '../../core'`

**Path Aliases:**
- Configured in `tsconfig.json` with `@gravito/` namespace
- Pattern: `@gravito/<package-name>` and `@gravito/<package-name>/*`
- Example: `import { Container } from '@gravito/core'` instead of `../../../core/src`
- Aliases exist for all 50+ framework packages

**Re-exports:**
- Use barrel files (index.ts) for public APIs
- Export core types and classes from package root
- Example in `packages/core/src/index.ts`: exports 100+ types and classes

## Error Handling

**Custom Exception Hierarchy:**
- Base class: `GravitoException extends Error` located at `packages/core/src/exceptions/GravitoException.ts`
- Constructor signature: `constructor(status: number, code: string, options: ExceptionOptions = {})`
- Properties: `status` (HTTP status), `code` (error code), `i18nKey` (i18n path), `i18nParams` (translation params)
- Subclasses follow naming: `ValidationException`, `AuthenticationException`, `AuthorizationException`, `ModelNotFoundException`, `CircularDependencyException`
- Location: `packages/core/src/exceptions/`

**Pattern - Exception with i18n:**
```typescript
export interface ExceptionOptions {
  message?: string
  cause?: unknown
  i18nKey?: string // e.g. 'errors.validation.failed'
  i18nParams?: Record<string, string | number>
}

public getLocalizedMessage(
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  if (this.i18nKey) {
    return t(this.i18nKey, this.i18nParams)
  }
  return this.message
}
```

**Error Handler:**
- Centralized error handling in `packages/core/src/ErrorHandler.ts`
- Exports `codeFromStatus()`, `messageFromStatus()` helpers
- Handles both JSON and HTML responses based on Accept header

**Test Exception Handling:**
- Throw custom exceptions and assert on `.status`, `.code` properties
- Example: `expect(ex.code).toBe('TEST_ERROR')` and `expect(ex.status).toBe(400)`

## Logging

**Framework:** console (no external logging dependency)

**Logger Interface:** `packages/core/src/Logger.ts`
- Methods: `debug()`, `info()`, `warn()`, `error()`
- Signature: `(message: string, ...args: unknown[]): void`

**ConsoleLogger Implementation:**
- Prefixes each log with level: `[DEBUG]`, `[INFO]`, `[WARN]`, `[ERROR]`
- Supports multiple arguments passed to console methods
- No external dependencies required

**Pattern - Implement Custom Logger:**
```typescript
export interface Logger {
  debug(message: string, ...args: unknown[]): void
  info(message: string, ...args: unknown[]): void
  warn(message: string, ...args: unknown[]): void
  error(message: string, ...args: unknown[]): void
}

export class ConsoleLogger implements Logger {
  debug(message: string, ...args: unknown[]): void {
    console.debug(`[DEBUG] ${message}`, ...args)
  }
}
```

**When to Log:**
- Use when integrating external services or performing I/O
- Not used for routine operational logs in most code
- Error handler logs via configured logger

## Comments

**When to Comment:**
- Complex algorithms or non-obvious logic
- Public API documentation (JSDoc)
- Integration points and side effects
- Architectural decisions or workarounds

**JSDoc/TSDoc:**
- Required on all public classes and functions
- Format: `/** */` block comments
- Example from codebase:
```typescript
/**
 * Register an event listener.
 *
 * @param event - Event class or event name
 * @param listener - Listener instance or listener class
 * @param options - Optional queue options
 *
 * @example
 * ```typescript
 * core.events.listen(UserRegistered, SendWelcomeEmail)
 * ```
 */
```

**Inline Comments:**
- Avoided when possible; code should be self-documenting
- Used only for complex conditional logic or business rules
- No trivial comments like `// increment counter`

**File Headers:**
- Package summary comments at top of index files
- Example: `@gravito/core - The core micro-kernel for the Galaxy Architecture.`

## Function Design

**Size:**
- Keep under 50 lines for readability
- Extract complex logic into separate functions
- Average observed: 20-40 lines per function

**Parameters:**
- Prefer destructuring objects over multiple parameters
- Use Factory type pattern for dependency injection: `(container: Container) => T`
- Generic types for flexibility: `listen<TEvent extends Event>(...)`

**Return Values:**
- Always explicitly typed: `Promise<void>`, `T | Promise<T>`, `T | null`
- Use union types for multiple possible return types: `Listener<TEvent> | (new () => Listener<TEvent>)`
- Never use implicit `any` - always type return values

**Generics:**
- Extensively used for type safety: `Container<T>`, `QueryBuilder<T>`, `Factory<T>`
- Constraints used: `<TEvent extends Event>`, `<T = unknown>`
- Bounds checked at call sites

## Module Design

**Exports:**
- Default exports: Not used - always use named exports
- Public API from index.ts: Re-exports all public interfaces and classes
- Internal modules use `@internal` JSDoc tag
- Example pattern in `packages/core/src/index.ts`:
```typescript
export { Container, type Factory, type ServiceKey, type ServiceMap } from './Container'
export type { ExceptionOptions } from './exceptions/GravitoException'
export { GravitoException } from './exceptions/GravitoException'
```

**Barrel Files:**
- Used strategically for grouping related exports
- Location: `src/index.ts` for package root, `src/group/index.ts` for subgroups
- Not used for every subdirectory - only meaningful groupings
- Example: `packages/core/src/exceptions/index.ts` exports all exception types

**File Coupling:**
- Avoid circular dependencies (pre-push hook validates this)
- Import from more general to more specific layers
- Adapters and utilities imported by domain logic, not vice versa

## TypeScript Strictness

**Strict Mode:** Enabled in `tsconfig.json`
- `strict: true` - All strict checks enabled
- `noUnusedLocals: true` - Every variable must be used
- `noUnusedParameters: true` - Every function parameter must be used
- `declaration: true` - Generate .d.ts files
- `skipLibCheck: true` - Skip type checking of .d.ts files for speed

**Type Inference:**
- Explicit return types on public functions
- Let TypeScript infer in arrow functions for brevity
- No `as any` without explanation comment
- Use `unknown` instead of `any` when type is truly unknown

**Decorators:**
- Experimental decorators enabled: `experimentalDecorators: true`
- Emit metadata enabled: `emitDecoratorMetadata: true`
- Used for DDD patterns and IoC registration in some modules

## Design Patterns

**Dependency Injection (IoC Container):**
- Container class in `packages/core/src/Container.ts`
- Register services: `container.bind()`, `container.singleton()`
- Resolve services: `container.make(key)`
- Request-scoped services: `Container.runWithScope(scope, fn)`
- Pattern example: Binding factories define creation logic
```typescript
container.bind('logger', (c) => new ConsoleLogger())
const logger = container.make('logger')
```

**Factory Pattern:**
- `Factory<T> = (container: Container) => T` type definition
- Used throughout for lazy instantiation
- Enable service provider pattern for configurations

**Observer/Event Pattern:**
- EventManager in `packages/core/src/EventManager.ts`
- Interface: `Listener<TEvent>` with `handle(event: TEvent): void | Promise<void>`
- Registration: `core.events.listen(EventClass, ListenerClass)`
- Dispatch: `core.events.dispatch(new MyEvent())`

**Repository Pattern:**
- Used in database modules (Atlas)
- Interface contract: `findAll()`, `findById()`, `create()`, `update()`, `delete()`
- Generic: `Repository<T>` with specific model types

**Builder Pattern:**
- QueryBuilder in Atlas for fluent SQL construction
- Methods return `this` for chaining: `builder.where().orWhere().orderBy()`
- Mailable pattern for email construction: `mail.to().cc().subject()`

**Adapter Pattern:**
- HTTP adapters: `packages/core/src/adapters/` directory
- Interfaces: `HttpAdapter`, `AdapterFactory`, `AdapterConfig`
- Implementations: `BunNativeAdapter`, `GravitoEngineAdapter`

**Service Provider Pattern:**
- ServiceProvider abstract class in `packages/core/src/ServiceProvider.ts`
- Methods: `register()`, `boot()`, `publishes()`
- Used for feature configuration and asset publishing

## Code Organization

**Separation of Concerns:**
- One class per file (with rare exceptions for small related types)
- Tests co-located with source via `tests/` or `__tests__/` directory
- Utilities extracted to separate modules

**Directory Structure Pattern:**
- `src/` - Implementation code
- `tests/` - Test files (mirrors src structure)
- `dist/` - Built output (generated)
- Subdirectories by feature/domain, not by file type

---

*Convention analysis completed: 2026-03-24*
