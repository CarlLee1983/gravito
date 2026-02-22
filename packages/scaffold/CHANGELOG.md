# @gravito/scaffold

## 3.1.1

### Patch Changes

- Convert all workspace:\* dependencies to version numbers for npm publishing

  - Fixed 144 workspace:\* dependencies across 58 packages
  - Ensures all packages work properly when installed from npm
  - Resolves issues with bunx and npm installation of CLI tools
  - All internal dependencies now use explicit version constraints

- Updated dependencies
  - @gravito/core@1.6.1

## 3.0.1

### Patch Changes

- Updated dependencies
  - @gravito/core@1.2.1

## 3.0.0

### Minor Changes

- Implement several more examples and fix module issues, including:
  - Support middleware in core route definitions.
  - Improve Atlas driver loading and dependency injection.
  - Add PostgreSQL support to Ecommerce MVC example.
  - Fix internal type resolution issues across packages.

### Patch Changes

- Updated dependencies
  - @gravito/core@1.2.0

## 2.1.0

### Minor Changes

- feat: add standalone-engine scaffolding template and cli option

## 2.0.0

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @gravito/core@1.1.0

## 1.1.0

### Minor Changes

- Refactored all scaffold generators (Enterprise MVC, Clean Architecture, Action Domain, DDD) to adopt the Service Provider pattern and a modern 4-step bootstrap lifecycle. Fixed a missing mock in @gravito/signal tests.

## 1.0.0

### Patch Changes

- Improve database grammar, core runtime types, and scaffolding generators.
- Updated dependencies
  - @gravito/core@1.0.0
