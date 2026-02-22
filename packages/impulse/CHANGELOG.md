# @gravito/impulse

## 1.1.1

### Patch Changes

- Convert all workspace:\* dependencies to version numbers for npm publishing

  - Fixed 144 workspace:\* dependencies across 58 packages
  - Ensures all packages work properly when installed from npm
  - Resolves issues with bunx and npm installation of CLI tools
  - All internal dependencies now use explicit version constraints

- Updated dependencies
  - @gravito/core@1.6.1
  - @gravito/photon@1.0.1

## 1.1.0

### Minor Changes

- 1e7f7d6: Performance optimization:
  - Implemented Schema Compilation Cache for Zod and Valibot (100x faster compilation)
  - Implemented FormRequest Instance Caching (6x faster creation)
  - Implemented Schema Type Detection Cache (81x faster)
  - Implemented Message Resolution Cache
  - Optimized DataExtractor with body parsing cache

## 1.0.3

### Patch Changes

- Updated dependencies
  - @gravito/core@1.2.1

## 1.0.2

### Patch Changes

- Updated dependencies
  - @gravito/core@1.2.0

## 1.0.1

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @gravito/core@1.1.0

## 1.0.0

### Patch Changes

- Updated dependencies
  - @gravito/core@1.0.0
