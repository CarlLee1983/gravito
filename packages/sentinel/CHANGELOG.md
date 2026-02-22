# @gravito/sentinel

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

## 4.0.0 - 2026-01-25

### Breaking Changes

- **CallbackUserProvider**: Removed fallback to `global.MOCK_USERS`. Users must now provide a `retrieveByCredentialsCallback`.
- **Middleware Types**: `auth()` and `can()` middleware now have proper TypeScript types (`GravitoContext`, `GravitoNext`).

### New Features

- **Remember Me**: Added "Remember Me" functionality to `SessionGuard` using secure cookies.
- **JWT Refresh Tokens**: Added `JwtRefreshGuard` for handling access and refresh token pairs.
- **Token Blacklist**: Added `TokenBlacklist` interface and `InMemoryTokenBlacklist` for token revocation.
- **Rate Limiting**: Added `throttleAuth` middleware to prevent brute-force attacks on auth endpoints.
- **Caching**: Added `CachedUserProvider` to cache user retrieval queries.
- **Token Hashing**: Added support for hashing tokens in `TokenGuard` (SHA-256/SHA-512).

### Performance Improvements

- **AuthManager**: Optimized guard resolution with internal caching flag.
- **User Caching**: implemented LRU-based user query caching.

### Documentation

- Comprehensive JSDoc added for all public APIs.
- Updated README with v4 migration guide.

### Test Coverage

- Increased overall test coverage to 90%+.

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

## 2.0.0

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @gravito/core@1.1.0

## 1.0.0

### Patch Changes

- Updated dependencies
  - @gravito/core@1.0.0
