# @gravito/pulse

## 3.3.0

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

### Patch Changes

- Updated dependencies
  - @gravito/scaffold@3.2.0

## 3.2.1

### Patch Changes

- Convert all workspace:\* dependencies to version numbers for npm publishing

  - Fixed 144 workspace:\* dependencies across 58 packages
  - Ensures all packages work properly when installed from npm
  - Resolves issues with bunx and npm installation of CLI tools
  - All internal dependencies now use explicit version constraints

- Updated dependencies
  - @gravito/core@1.6.1
  - @gravito/scaffold@3.1.1

## 3.0.1

### Patch Changes

- Updated dependencies
  - @gravito/core@1.2.1
  - @gravito/scaffold@3.0.1

## 3.0.0

### Patch Changes

- Updated dependencies
  - @gravito/core@1.2.0
  - @gravito/scaffold@3.0.0

## 2.1.0

### Minor Changes

- feat: add standalone-engine scaffolding template and cli option

### Patch Changes

- Updated dependencies
  - @gravito/scaffold@2.1.0

## 2.0.0

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @gravito/core@1.1.0
  - @gravito/scaffold@2.0.0

## 1.0.1

### Patch Changes

- Updated dependencies
  - @gravito/scaffold@1.1.0

## 1.0.0

### Patch Changes

- Updated dependencies
  - @gravito/core@1.0.0
  - @gravito/scaffold@1.0.0
