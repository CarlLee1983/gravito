# @gravito/spectrum

## 3.0.2

### Patch Changes

- Convert all workspace:\* dependencies to version numbers for npm publishing

  - Fixed 144 workspace:\* dependencies across 58 packages
  - Ensures all packages work properly when installed from npm
  - Resolves issues with bunx and npm installation of CLI tools
  - All internal dependencies now use explicit version constraints

- Updated dependencies
  - @gravito/core@1.6.1
  - @gravito/photon@1.0.1

## 3.0.2

### Patch Changes

- Fixed config consistency: `maxItems` now properly passed to storage backends during initialization
- Enhanced FileStorage.prune() to handle logs and queries in addition to requests
- Added request-log-query correlation via `requestId` field for better debugging
- Improved SSE connection cleanup to prevent memory leaks from disconnected clients
- Added CSRF protection for POST endpoints (`/clear`, `/replay`) for enhanced security
- Added EventSource cleanup in Vue dashboard via `unmounted` lifecycle hook
- Updated dashboard UI to send CSRF tokens with POST requests and handle validation errors

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

## 1.0.1

### Patch Changes

- Updated dependencies
  - @gravito/core@1.0.0

## 1.0.1-beta.1

### Patch Changes

- beta republish to align with 1.0 beta rollout

## 1.0.0

### Minor Changes

- bc76ff3: feat: introduce Spectrum debug dashboard
  feat: add global query listeners to Atlas connection
