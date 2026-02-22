# @gravito/stasis

## 3.1.1

### Patch Changes

- Convert all workspace:\* dependencies to version numbers for npm publishing

  - Fixed 144 workspace:\* dependencies across 58 packages
  - Ensures all packages work properly when installed from npm
  - Resolves issues with bunx and npm installation of CLI tools
  - All internal dependencies now use explicit version constraints

- Updated dependencies
  - @gravito/core@1.6.1

## 3.1.0

### Minor Changes

- **Predictive Caching**: Implemented `PredictiveStore` and `MarkovPredictor` to enable smart prefetching based on access patterns (Architecture v2.0).
- Added `driver: 'predictive'` support to `OrbitStasis` configuration.

## 3.0.1

### Patch Changes

- Updated dependencies
  - @gravito/core@1.2.1

## 3.0.0

### Patch Changes

- Updated dependencies
  - @gravito/core@1.2.0
  - @gravito/plasma@1.0.0

## 2.0.0

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @gravito/core@1.1.0

## 1.0.0

### Patch Changes

- Updated dependencies
  - @gravito/core@1.0.0
