# Contributing to @gravito/atlas

Thank you for your interest in contributing to the Atlas database toolkit! This guide will help you understand our development process and best practices.

## Development Setup

### Prerequisites

- **Bun** v1.3+ (installed via [bun.sh](https://bun.sh))
- **Node.js** v18+ (for compatibility)
- **Git** for version control

### Local Development

```bash
# Clone the repository
git clone https://github.com/gravito-framework/gravito.git
cd gravito/packages/atlas

# Install dependencies
bun install

# Run type checking
bun run typecheck

# Run tests
bun run test

# Run specific test file
bun test tests/unit/SafeQueryBuilder.test.ts
```

## Code Style & Standards

### TypeScript Configuration

Atlas enforces strict TypeScript mode:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

**Requirements**:
- ✅ All variables and parameters must have explicit types
- ✅ No `@ts-ignore` comments without explanation
- ✅ All exports must be properly typed
- ✅ Functions should have JSDoc comments

### Code Formatting

- **Line Width**: 100 characters
- **Indentation**: 2 spaces (no tabs)
- **Quotes**: Single quotes (except in JSON)
- **Semicolons**: No semicolons (Biome removes them)
- **Trailing Commas**: ES5 style (included)

Biome is automatically applied on commit via lint-staged.

### Import Organization

```typescript
// 1. Relative imports from parent directories
import { Expression } from '../query/Expression'

// 2. Relative imports from same directory
import { SafeIdentifier } from './SafeIdentifier'

// 3. Type imports (grouped separately)
import type { ConnectionContract } from '../types'
```

## Query Construction: When to Use What

### Use `QueryBuilder` (Fluent API)

For complex, programmatic query construction:

```typescript
// ✅ Good - fluent API for complex queries
let query = db.table('users')

if (filters.status) {
  query = query.where('status', filters.status)
}

if (filters.createdAfter) {
  query = query.whereDate('created_at', '>', filters.createdAfter)
}

const users = await query.get()
```

### Use `SafeQueryBuilder` (Tagged Templates)

For simple queries with user input (SQL injection safe):

```typescript
// ✅ Good - parameter binding, no injection risk
const userId = req.body.userId // User-provided input
const user = await db.sql`SELECT * FROM users WHERE id = ${userId}`.first()

// ✅ Good - with identifier for dynamic table names
import { identifier } from '@gravito/atlas'
const table = identifier(req.query.table) // Validated
const data = await db.sql`SELECT * FROM ${table}`.all()
```

### Never Do This

```typescript
// ❌ Bad - SQL injection vulnerability
const userId = req.body.userId
const user = await db.raw(`SELECT * FROM users WHERE id = ${userId}`)

// ❌ Bad - string concatenation
const table = req.query.table
const data = await db.raw(`SELECT * FROM ${table}`)

// ❌ Bad - mixed approach
const query = `SELECT * FROM users WHERE id = ${userId}`
await db.raw(query)
```

## Testing Requirements

### Minimum Coverage: 80%

All contributions must maintain or improve test coverage:

```bash
# Run tests with coverage
bun run test:coverage

# Check coverage thresholds
# - Statements: 80%
# - Branches: 75%
# - Functions: 80%
# - Lines: 80%
```

### Test File Organization

- **Unit Tests**: `tests/unit/*.test.ts`
- **Integration Tests**: `tests/integration/*.test.ts`
- **Benchmarks**: `tests/benchmarks/*.bench.ts`

### Writing Tests

```typescript
import { describe, expect, it } from 'bun:test'

describe('FeatureName', () => {
  describe('specific behavior', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test'

      // Act
      const result = processInput(input)

      // Assert
      expect(result).toBe('expected')
    })
  })
})
```

### Test Naming Conventions

```typescript
// ✅ Good - describes what should happen
it('should return all active users when filtering by status', () => {})
it('should throw an error when identifier contains semicolon', () => {})
it('should compile safe query with multiple parameters', () => {})

// ❌ Bad - doesn't describe behavior
it('tests users', () => {})
it('works', () => {})
it('user filtering', () => {})
```

## Security Best Practices

### SQL Injection Prevention

**Use SafeQueryBuilder for all user input:**

```typescript
// ✅ Safe - parameter binding
const email = req.body.email
const user = await db.sql`SELECT * FROM users WHERE email = ${email}`.first()

// ✅ Safe - validated identifier
import { identifier } from '@gravito/atlas'
const col = identifier('email')
const user = await db.sql`SELECT ${col} FROM users`.first()

// ❌ Unsafe - string concatenation
const user = await db.raw(`SELECT * FROM users WHERE email = '${email}'`)
```

### Input Validation

Always validate user input at system boundaries:

```typescript
import { z } from 'zod'

// Define validation schema
const userIdSchema = z.number().positive()

// Validate before using
const userId = userIdSchema.parse(req.body.userId)
const user = await db.sql`SELECT * FROM users WHERE id = ${userId}`.first()
```

### Type Safety

Leverage TypeScript for compile-time safety:

```typescript
interface User {
  id: number
  email: string
  name: string
}

// Type-safe query result
const user: User | null = await db.sql<User>`
  SELECT * FROM users WHERE id = ${userId}
`.first()

// TypeScript catches type mismatches
const email: string = user.email // ✅ Correct
const id: number = user.email    // ❌ Type error
```

## Commit Message Format

```
<type>: [<scope>] <subject>

<optional body>
```

### Type

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring
- `perf`: Performance improvement
- `test`: Test additions/updates
- `docs`: Documentation
- `chore`: Build process, dependencies
- `ci`: CI/CD configuration

### Scope

- `atlas` - Core Atlas package
- `core` - Core functionality
- `query` - Query builder
- `orm` - ORM/Model layer
- `connection` - Database connections

### Subject

- Use imperative mood ("add" not "added")
- No period at end
- Lowercase first letter
- Keep under 50 characters

### Examples

```
feat: [query] Add SafeQueryBuilder with SQL injection protection

fix: [connection] Handle connection pool exhaustion

perf: [query] Optimize LRU cache eviction to O(1)

test: [orm] Add comprehensive model relationship tests

docs: [atlas] Update safe queries documentation
```

## Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feat/my-feature
   ```

2. **Make Changes**
   - Write tests first (TDD approach)
   - Implement feature
   - Ensure all tests pass
   - Update documentation

3. **Run Quality Checks**
   ```bash
   bun run typecheck    # TypeScript
   bun run check        # Biome format & lint
   bun run test         # All tests
   ```

4. **Commit Changes**
   ```bash
   git commit -m "feat: [scope] Description"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feat/my-feature
   ```

## Performance Considerations

### Benchmarking

For performance-sensitive code, add benchmarks:

```bash
# Run benchmarks
bun --bun tests/benchmarks/BunSQLDriver.bench.ts

# See baseline results
# Location: tests/benchmarks/*.bench.ts
```

### Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| Query compilation | <100ns | SafeQueryBuilder |
| Parameter binding | <50ns | Per parameter |
| Cache lookup | <1ns | LRU cache (O(1)) |
| Type checking | <0ms | No runtime cost |

## Documentation Updates

When adding new features:

1. **Update Code Comments**
   ```typescript
   /**
    * Brief description
    * @param param Description
    * @returns Return type description
    * @example
    * ```typescript
    * // Example usage
    * ```
    */
   ```

2. **Update README.md**
   - Add to Features section
   - Include usage example

3. **Add Doc Files** (if significant)
   - Location: `docs/feature-name.md`
   - Reference from README

4. **Update API Reference**
   - Add to `docs/api.md`
   - Include type signatures

## Common Development Tasks

### Add a New Query Method

```typescript
// 1. Define in QueryBuilder
async method(params: Type): Promise<Result> {
  // Implementation
}

// 2. Add to QueryBuilderContract type
interface QueryBuilderContract {
  method(params: Type): Promise<Result>
}

// 3. Write tests in tests/unit/QueryBuilder.test.ts
it('should correctly implement method', () => {})

// 4. Update documentation if needed
```

### Add Tests for New Feature

```typescript
// File: tests/unit/FeatureName.test.ts
import { describe, expect, it } from 'bun:test'

describe('FeatureName', () => {
  it('should do something', () => {
    // Test here
  })
})

// Run: bun test tests/unit/FeatureName.test.ts
```

### Fix a Type Error

```bash
# Check what's wrong
bun run typecheck

# Fix the issue
# 1. Add explicit types
# 2. Use proper type guards
# 3. Update type definitions if needed

# Verify fix
bun run typecheck
```

## Getting Help

- **Questions**: Open a GitHub discussion
- **Bugs**: File an issue with reproduction steps
- **Security**: Report to security@gravito.dev
- **Documentation**: Contribute to docs/

## Code Review Process

All pull requests require:

1. ✅ All tests passing
2. ✅ TypeScript strict mode compliant
3. ✅ Code style checks passing
4. ✅ Documentation updated
5. ✅ Maintainer approval

Reviewers will check for:
- Security issues
- Performance implications
- Test coverage
- API design consistency
- Documentation clarity

## Release Process

Releases follow semantic versioning:

- `patch`: Bug fixes and minor updates (v1.0.1)
- `minor`: New features, backward compatible (v1.1.0)
- `major`: Breaking changes (v2.0.0)

See [CHANGELOG.md](CHANGELOG.md) for version history.

## Questions or Issues?

- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For questions and ideas
- **Security**: security@gravito.dev for vulnerabilities

Thank you for contributing! 🚀

