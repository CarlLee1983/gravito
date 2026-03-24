# Testing Patterns

**Analysis Date:** 2026-03-24

## Test Framework

**Runtime:**
- Framework: Bun test (built-in test runner)
- No separate test framework dependency required
- Direct import: `import { describe, expect, it, test, beforeEach, afterEach, mock } from 'bun:test'`

**Additional Testing Tools:**
- Vitest config used for browser-based tests (React components)
- Location: `packages/support-chat-widget/vitest.config.ts` and `templates/static-site/vitest.config.ts`
- Coverage: V8 provider (configured in Vitest)

**Assertion Library:**
- Built-in expect API from Bun test
- Methods: `toBe()`, `toEqual()`, `toHaveLength()`, `toContain()`, `toHaveBeenCalled()`, `toThrow()`, `rejects.toThrow()`

**Run Commands:**
```bash
# All tests (10s timeout)
bun test --timeout=10000

# With coverage report
bun test --timeout=10000 --coverage --coverage-reporter=lcov --coverage-dir coverage

# Unit tests only
bun run test:unit              # @ package level, runs only *.test.ts (not *.integration.test.ts)

# Integration tests only
bun run test:integration      # @ package level, runs only *.integration.test.ts

# Monorepo tests
bun run test                  # @ root, runs via turbo for all packages

# Coverage check
bun run --bun scripts/check-coverage.ts
```

**Coverage Requirements:**
- Enforced per package via `scripts/check-coverage.ts`
- Target: 75%+ coverage (varies by package criticality)
- Reported: lcov format, HTML reports in coverage/ directory

## Test File Organization

**Location Pattern:**
- Co-located with source: `packages/<name>/tests/` directory at root level
- Alternative for engine/native code: `src/engine/__tests__/` subdirectory
- Total test files: 835 across 50+ packages

**Naming Convention:**
- Unit tests: `*.test.ts` (e.g., `ioc.test.ts`, `exceptions.test.ts`)
- Integration tests: `*.integration.test.ts`
- Setup files: `tests/setup.ts` (for browser tests)
- Vitest setup: `tests/setup.ts` with environment configuration

**File Examples:**
- `packages/core/tests/ioc.test.ts` - IoC container tests
- `packages/core/tests/exceptions.test.ts` - Exception handling tests
- `packages/core/tests/service-provider.test.ts` - Service provider tests
- `packages/atlas/tests/QueryBuilder.test.ts` - QueryBuilder fluent API tests
- `packages/signal/tests/mailable.test.ts` - Email system tests
- `packages/spectrum/tests/memory-storage.test.ts` - Storage tests

## Test Structure

**Suite Organization:**
```typescript
import { describe, expect, it } from 'bun:test'
import { Container } from '../src'

describe('PlanetCore IoC', () => {
  it('should boot with empty config', async () => {
    const core = await PlanetCore.boot({})
    expect(core).toBeInstanceOf(PlanetCore)
  })

  describe('nested context', () => {
    it('should handle nested scenario', () => {
      // test body
    })
  })
})
```

**Patterns Observed:**
- `describe()` for test suites/groups
- `it()` or `test()` for individual test cases
- Descriptive names starting with "should": "should boot with empty config"
- Nested `describe()` blocks for related scenarios
- Async/await for async operations: `async () => { await operation() }`

**Lifecycle Hooks:**
- `beforeEach()` - Runs before each test (setup)
- `afterEach()` - Runs after each test (teardown)
- No global setup observed in unit tests; Vitest setup in `tests/setup.ts` for browser tests

**Actual Pattern Examples:**

From `packages/core/tests/ioc.test.ts`:
```typescript
describe('PlanetCore IoC', () => {
  it('should boot with empty config', async () => {
    const core = await PlanetCore.boot({})
    expect(core).toBeInstanceOf(PlanetCore)
  })

  it('should load orbits defined in config (Class Reference)', async () => {
    const config = defineConfig({
      orbits: [MockOrbit],
    })
    const core = await PlanetCore.boot(config)
    expect(core.config.get<boolean>('mock-orbit:loaded')).toBe(true)
  })
})
```

From `packages/atlas/tests/QueryBuilder.test.ts`:
```typescript
describe('QueryBuilder', () => {
  let builder: QueryBuilder
  let grammar: PostgresGrammar
  let connection: ConnectionContract

  beforeEach(() => {
    grammar = new PostgresGrammar()
    connection = createMockConnection()
    builder = new QueryBuilder(connection, grammar, 'users')
  })

  describe('select', () => {
    it('should set columns to select', () => {
      builder.select('id', 'name', 'email')
      expect(builder.toSql()).toBe('SELECT "id", "name", "email" FROM "users"')
    })
  })
})
```

## Mocking

**Framework:** Bun's built-in mock utility

**Pattern - Mock Objects:**
```typescript
import { describe, expect, it, mock } from 'bun:test'

// Mock transport class
class MockTransport implements Transport {
  public sentMessages: Message[] = []
  async send(message: Message): Promise<void> {
    this.sentMessages.push(message)
  }
}

// Usage
const transport = new MockTransport()
await mailer.send(mail)
expect(transport.sentMessages.length).toBe(1)
```

**Pattern - Mock Functions:**
```typescript
const flashMock = mock((_key: string, _value: unknown) => undefined)
const sessionMock = { flash: flashMock }
// Later: assert calls
expect(flashMock).toHaveBeenCalledTimes(2)
```

**Pattern - Mock Connections (Database):**
```typescript
function createMockConnection(): ConnectionContract {
  const mockDriver: DriverContract = {
    getDriverName: () => 'postgres',
    connect: async () => {},
    query: async () => ({ rows: [], rowCount: 0 }),
    // ... other methods
  }
  return {
    getName: () => 'test',
    getDriver: () => mockDriver,
    // ... other methods
  }
}
```

**What to Mock:**
- External dependencies: databases, HTTP clients, file systems
- Services that are slow or unreliable: email, storage
- Event handlers and listeners (use test double implementations)
- Time-dependent functionality (use fixed values instead of Date.now())

**What NOT to Mock:**
- Core business logic being tested
- Utility functions and helpers
- Exception classes (test actual exceptions)
- The module under test itself

## Fixtures and Factories

**Test Data Helpers:**
```typescript
// Location: packages/<name>/tests/ with source
// Pattern: Create factory functions for test data

function createMockConnection(): ConnectionContract {
  // Returns a fully configured mock with sensible defaults
}

class WelcomeMail extends Mailable {
  constructor(private name: string) { super() }
  build() {
    return this.subject('Welcome!').html(`<h1>Welcome, ${this.name}</h1>`)
  }
}

// Usage in tests
const mail = new WelcomeMail('Carl').to('carl@example.com')
```

**Inline Fixtures:**
- No separate fixture files observed
- Test data created inline in test functions
- Factory functions for reusable setup: `createMockConnection()`, `createMockDriver()`

**Location:**
- Fixtures inline in test file
- Factories at top of test file before describe block
- Class mocks defined in same file where used

## Coverage

**Requirements:**
- Minimum 75%+ coverage per package (enforced by `scripts/check-coverage.ts`)
- Critical packages (core, atlas, photon) may have higher requirements
- Coverage measured: statement, branch, function, line

**View Coverage:**
```bash
# Generate coverage
bun test --timeout=10000 --coverage --coverage-reporter=lcov --coverage-dir coverage

# View HTML report (if generated)
open coverage/index.html
```

**Coverage Configuration:**
- Provider: V8 (Bun native)
- Reporters: text (console), json (programmatic), html (visual)
- Exclude patterns: node_modules/, dist/, tests/, **/*.test.ts, **/*.spec.ts
- Vitest config example (in `support-chat-widget/vitest.config.ts`):
```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  exclude: ['node_modules/', 'dist/', 'tests/', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
}
```

## Test Types

**Unit Tests:**
- Scope: Individual functions, classes, utilities
- Pattern: Arrange-Act-Assert (AAA)
- Example: `container.bind()`, `toSql()` generation, exception construction
- Files: `tests/*.test.ts`
- Timeout: 10 seconds (configured in package.json scripts)

**Integration Tests:**
- Scope: Multiple components working together
- Pattern: Set up real (or mock) dependencies, test end-to-end flow
- Examples:
  - QueryBuilder with Grammar and Connection
  - EventManager with listeners
  - Exception handling with session/flash
- Files: `tests/*.integration.test.ts` (optional suffix for separation)
- Timeout: 10 seconds (same as unit tests)

**E2E Tests:**
- Framework: Playwright (not analyzed in detail here)
- Not apparent in core packages; used for browser testing in examples
- Found in: `examples/rest-api-demo/` and `packages/support-chat-widget/`

## Common Patterns

**Async Testing:**
```typescript
// Pattern 1: async/await
it('should boot with config', async () => {
  const core = await PlanetCore.boot(config)
  expect(core).toBeDefined()
})

// Pattern 2: Promise rejection
it('should throw error on invalid input', async () => {
  expect(mail.renderContent()).rejects.toThrow('No content renderer')
})
```

**Error Testing:**
```typescript
// Pattern 1: Exception type and properties
it('handles GravitoException as JSON', async () => {
  const core = new PlanetCore()
  core.router.get('/error', () => {
    throw new TestException()
  })

  const res = await core.adapter.fetch(
    new Request('http://localhost/error')
  )
  expect(res.status).toBe(400)
  const json = await res.json()
  expect(json.error.code).toBe('TEST_ERROR')
})

// Pattern 2: toThrow assertions
expect(() => {
  container.make('nonexistent')
}).toThrow(NotFoundException)
```

**Fluent API Testing:**
```typescript
it('should build query with where clauses', () => {
  builder
    .select('id', 'name')
    .where('status', 'active')
    .orWhere('status', 'pending')
    .orderBy('id')

  expect(builder.toSql()).toContain('WHERE "status"')
  expect(builder.getBindings()).toEqual(['active', 'pending'])
})
```

**Mocking Calls:**
```typescript
const flashMock = mock((_key: string, _value: unknown) => undefined)
// ... run test ...
expect(flashMock).toHaveBeenCalledTimes(2)
expect(flashMock).toHaveBeenCalledWith('errors', [...])
```

## Test Isolation

**Request Scope Testing:**
- Pattern: Use `Container.runWithScope(scope, fn)` for request-scoped services
- Ensures each test has isolated scope
- Prevents service leakage between tests

**Configuration Reset:**
- Each test creates fresh ConfigManager instance
- Prevents test pollution via config mutations

**Container Reset:**
- Tests create new Container instances
- No shared container state between tests
- Bindings not persisted across tests

## Performance Considerations

**Timeout Configuration:**
- Global timeout: 10 seconds (configured in package.json `"--timeout=10000"`)
- Applies to all tests, async and sync
- Individual tests cannot override in Bun test

**Benchmarking:**
- Observed command: `bun run benchmark:event-system` (in @gravito/core)
- Uses Mitata library for performance benchmarks
- Not part of regular test suite

## CI/CD Integration

**CI Commands:**
```bash
# Full CI run (coverage enforced)
bun run test:ci    # @ package level

# Monorepo CI
bun run test --filter='./packages/*'  # via turbo
```

**Coverage Enforcement:**
- Script: `packages/<name>/scripts/check-coverage.ts`
- Runs after test collection
- Fails if coverage below threshold

**Pre-push Hook:**
- Git hook: `bun scripts/validate-affected-packages.ts`
- Validates types and tests for changed packages
- Prevents pushing code with failing tests

---

*Testing analysis completed: 2026-03-24*
