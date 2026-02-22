# @gravito/signal

## 3.0.4

### Patch Changes

- Convert all workspace:\* dependencies to version numbers for npm publishing

  - Fixed 144 workspace:\* dependencies across 58 packages
  - Ensures all packages work properly when installed from npm
  - Resolves issues with bunx and npm installation of CLI tools
  - All internal dependencies now use explicit version constraints

- Updated dependencies
  - @gravito/core@1.6.1
  - @gravito/prism@3.1.1
  - @gravito/stream@2.0.2

## 3.0.3

### Patch Changes

- Updated dependencies [6234dab]
  - @gravito/prism@3.0.2

## 3.0.2

### Patch Changes

- Updated dependencies [905588f]
  - @gravito/stream@2.0.1

## 3.0.1

### Patch Changes

- Updated dependencies
  - @gravito/core@1.2.1
  - @gravito/stream@1.0.3
  - @gravito/prism@3.0.1

## 3.0.0

### Patch Changes

- Updated dependencies
  - @gravito/core@1.2.0
  - @gravito/prism@3.0.0
  - @gravito/stream@1.0.2

## 2.0.0

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @gravito/core@1.1.0
  - @gravito/prism@2.0.0
  - @gravito/stream@1.0.1

## 1.0.1

### Patch Changes

- Refactored all scaffold generators (Enterprise MVC, Clean Architecture, Action Domain, DDD) to adopt the Service Provider pattern and a modern 4-step bootstrap lifecycle. Fixed a missing mock in @gravito/signal tests.

## 1.0.0

### Patch Changes

- Updated dependencies
  - @gravito/core@1.0.0
  - @gravito/stream@1.0.0
  - @gravito/prism@1.0.0
