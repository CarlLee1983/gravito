# @gravito/nebula

## 4.1.1

### Patch Changes

- Convert all workspace:\* dependencies to version numbers for npm publishing

  - Fixed 144 workspace:\* dependencies across 58 packages
  - Ensures all packages work properly when installed from npm
  - Resolves issues with bunx and npm installation of CLI tools
  - All internal dependencies now use explicit version constraints

- Updated dependencies
  - @gravito/core@1.6.1

## 4.0.0

### Major Changes

- **Architecture Overhaul**: Migrated to Manager + Store Driver pattern (aligned with `@gravito/stasis`).
- **Multi-Disk Support**: Added support for multiple storage disks via `storage.disk('name')`.
- **New API Methods**: Added `exists`, `copy`, `move`, `getMetadata`, `list`, `getSignedUrl`.
- **Type Safety**: Improved type definitions and removed unnecessary optional chaining.
- **Security**: Enhanced path traversal protection in `LocalStore`.

### Minor Changes

- Added `StorageManager` class.
- Added `StorageRepository` class.
- Added `LocalStore`, `MemoryStore`, `NullStore` implementations.
- Added new hooks: `storage:copied`, `storage:moved`.

### Deprecations

- Deprecated `StorageProvider` (use `StorageStore`).
- Deprecated `LocalStorageProvider` (use `LocalStore`).
- Deprecated `OrbitStorageOptions` (use `OrbitNebulaOptions`).
- Legacy configuration format is supported but deprecated.

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
