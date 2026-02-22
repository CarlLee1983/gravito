# @gravito/constellation

## 3.1.1

### Patch Changes

- Convert all workspace:\* dependencies to version numbers for npm publishing

  - Fixed 144 workspace:\* dependencies across 58 packages
  - Ensures all packages work properly when installed from npm
  - Resolves issues with bunx and npm installation of CLI tools
  - All internal dependencies now use explicit version constraints

- Updated dependencies
  - @gravito/core@1.6.1
  - @gravito/photon@1.0.1
  - @gravito/stream@2.0.2

## 3.1.0

### Minor Changes

- **Stream Writing**: Implemented `writeStream` method for all storage backends (Disk, Memory, S3, GCP)

  - Reduces memory peaks by 40%+ for large sitemaps through async iterable streaming
  - Storage implementations automatically handle stream-to-storage pipeline
  - Falls back to traditional `write()` method for backward compatibility

- **Gzip Compression**: Native support for `.xml.gz` compressed sitemaps

  - Reduces file size by 70%+ with configurable compression levels (1-9)
  - Automatic Content-Encoding header management
  - Seamless integration with all storage backends
  - New `CompressionOptions` interface with `enabled`, `format`, and `level` properties

- **Enhanced SitemapStream**: Added `toAsyncIterable()` method for memory-efficient XML generation

  - Yields XML chunks instead of building complete string in memory
  - Internal refactoring using generator patterns for better code reuse

- **Type Safety Improvements**:

  - Added compression level validation (1-9 range)
  - Improved error handling with stream cleanup on failures
  - Fixed type annotations (removed `any` types)

- **API Exports**: New compression utilities exported from package
  - `compressToBuffer()`: Compress async iterables to gzip Buffer
  - `createCompressionStream()`: Create gzip Transform streams
  - `toGzipFilename()` / `fromGzipFilename()`: Filename utilities
  - `CompressionConfig` interface

### Patch Changes

- Fixed `.gz` filename handling logic to avoid duplication
- Corrected GCP Storage Content-Type for compressed files
- Added comprehensive test coverage for compression utilities
- Updated README with stream writing and compression examples

## 3.0.2

### Patch Changes

- 7711324: fix: replace insecure Math.random() with crypto.randomUUID() for shadow ID generation (CWE-330) in ShadowProcessor, S3SitemapStorage, and GCPSitemapStorage.
- Updated dependencies [905588f]
  - @gravito/stream@2.0.1

## 3.0.1

### Patch Changes

- 修復 shadowProcessor 使用問題
- Updated dependencies
  - @gravito/core@1.2.1
  - @gravito/stream@1.0.3

## 3.0.0

### Patch Changes

- Updated dependencies
  - @gravito/core@1.2.0
  - @gravito/stream@1.0.2

## 2.0.0

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @gravito/core@1.1.0
  - @gravito/stream@1.0.1

## 1.0.0

### Patch Changes

- Updated dependencies
  - @gravito/core@1.0.0
  - @gravito/stream@1.0.0
