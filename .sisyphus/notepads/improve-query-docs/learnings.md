# Learnings - Improve Query JSDoc

## Project Conventions
- Fluent interface for SQL query building.
- Uses `@template T` for record types.
- Internal state management methods like `ensureOwnState` should be marked with `@internal`.
- Comprehensive `@example` blocks are required for complex methods.
