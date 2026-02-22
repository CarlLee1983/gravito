# @gravito/ion

## 4.0.1

### Patch Changes

- Convert all workspace:\* dependencies to version numbers for npm publishing

  - Fixed 144 workspace:\* dependencies across 58 packages
  - Ensures all packages work properly when installed from npm
  - Resolves issues with bunx and npm installation of CLI tools
  - All internal dependencies now use explicit version constraints

- Updated dependencies
  - @gravito/core@1.6.1
  - @gravito/photon@1.0.1

## 4.0.0

### Major Features

- **Inertia v2 Protocol Implementation** ✨
  - Deferred Props: Skip initial render, load props separately with grouping support
  - Merge Strategies: Shallow merge, prepend, and deep-merge for partial reloads
  - location() method: Smart redirect (409 Conflict for Inertia, 302 for regular requests)
  - encryptHistory() & clearHistory(): Control browser history API behavior
  - withErrors(): Form validation errors organized by named bags
  - X-Inertia-Reset header: Reset specified props before merging
  - CSRF Protection: Automatic XSRF-TOKEN cookie generation

### Performance Improvements

- **Version Caching**: 60-second TTL for dynamic version() functions (10-50ms savings per request)
- **Immutable shareAll()**: Fixed mutation issue using immutable spread operator
- **Optimized Props Resolution**: Enhanced lazy prop execution and caching

### Developer Experience

- **Enhanced Error Pages**: Rich HTML error pages in development with:
  - Component name and error message
  - Full stack trace with formatting
  - Styled error UI with developer hints
- **Production Safety**: Plain error messages in production (security best practice)
- **Method Chaining**: All new methods support fluent interface
- **CSRF Integration**: Configurable XSRF-TOKEN cookie generation

### New Type System

- `DeferredPropDefinition<T>`: Mark lazy-loaded props with factory functions
- `MergedPropDefinition<T>`: Control merge/prepend/deepMerge operations
- `InertiaPageObject`: Extended page object with v2 fields
- `PartialReloadMetadata`: Handle reset scenarios

### Test Coverage

- Added 18 comprehensive tests (41/41 total passing)
- 100% Inertia v2 protocol feature coverage
- Full CSRF integration tests
- Dev mode error page tests

### Breaking Changes

None. Full backward compatibility maintained.

### Dependencies

- Updated @gravito/core to support new types

## 3.0.1

### Patch Changes

- Updated dependencies
  - @gravito/core@1.2.1

## 3.0.0

### Patch Changes

- Updated dependencies
  - @gravito/core@1.2.0

## 2.0.0

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @gravito/core@1.1.0

## 1.0.0

### Patch Changes

- Updated dependencies
  - @gravito/core@1.0.0
