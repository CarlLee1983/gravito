# @gravito/scaffold

## 4.0.0

### Major Changes

- Allow developers to choose database driver for core profile

### Patch Changes

- 2b811e3: Allow developers to choose database driver for core profile

  The core profile previously defaulted to SQLite, forcing all users to install better-sqlite3 even if they wanted to use PostgreSQL or MySQL.

  Changes:

  - Core profile database driver changed from 'sqlite' to 'none'
  - Developers can now choose their preferred database after project creation:
    - SQLite: bun add better-sqlite3
    - PostgreSQL: bun add pg
    - MySQL: bun add mysql2
  - DependencyValidator updated to recognize 'none' driver (no dependencies required)
  - ConfigGenerator now intelligently selects database config based on driver type
  - All generators updated to respect profile configuration

  This improves the onboarding experience by reducing unnecessary dependencies and giving developers flexibility to choose their database at setup time.

## 3.2.0

### Minor Changes

- Implement Gravito DX improvements: --architecture option and code generators

  ## Features

  ### @gravito/pulse (CLI)

  - Add `--architecture` option to `create` command (mvc, ddd, cqrs)
  - Interactive architecture selection with visual menu
  - Architecture metadata stored in package.json for make:\* commands

  ### @gravito/scaffold

  - New architecture-aware code generator framework (GeneratorBase.ts)
  - Implement ControllerGenerator with --resource and --api options
  - Support mvc/ddd/cqrs specific directory structures
  - Auto-detect project architecture from package.json

  ## Templates Added

  - **mvc-starter**: Complete MVC application with Auth, ORM, Validation, Error handling
  - **ddd-starter**: Domain-Driven Design architecture skeleton
  - **cqrs-starter**: CQRS pattern with Command/Query separation

  ## Documentation

  - New Laravel developer quick-start guide with concept mapping and CRUD examples

  ## Breaking Changes

  None - fully backward compatible with existing --template option

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
