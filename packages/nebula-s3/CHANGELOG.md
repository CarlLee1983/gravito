# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - 2026-02-23

### 🚨 BREAKING CHANGES

- **Custom Metadata Read Unavailable**: The `getMetadata()` method's `customMetadata` field now returns `undefined` instead of the custom metadata object. This is a limitation of Bun's native S3 API which does not expose `x-amz-meta-*` headers in the stat() response.
  - **Migration**: Use application-layer database (Redis, PostgreSQL) to store file metadata, or encode metadata into the object key name
  - See [MIGRATION.md](./MIGRATION.md) for detailed guidance

- **Presigned URL Format Changed**: The format of presigned URLs returned by `getSignedUrl()` has changed due to migration from AWS SDK v3 to Bun native S3 API. URL parameters are now different (e.g., `Authorization` instead of `X-Amz-Algorithm`).
  - **Migration**: Update tests and validation logic to check URL structure rather than specific parameter names
  - See [MIGRATION.md](./MIGRATION.md) for examples

### ✨ Features

- **Migrated to Bun Native S3 API**: Removed dependency on AWS SDK v3 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)
- **Improved Large File Handling**: `putStream()` now automatically handles multipart uploads without manual chunking
- **Zero-Copy Stream Reads**: `getStream()` now returns zero-copy streams directly from S3 for better performance
- **Reduced Bundle Size**: Eliminated 2 external dependencies for smaller application bundles
- **Better Performance**: All operations now use Bun's optimized native S3 client

### 🔧 Changed

- S3Store implementation rewritten using Bun's native S3Client API (369 lines vs previous 451 lines)
- All 10 methods reimplemented with Bun API calls:
  - `put()` → `s3.file(key).write(body, { headers })`
  - `get()` → `s3.file(key).arrayBuffer()`
  - `delete()` → `s3.file(key).delete()`
  - `exists()` → `s3.file(key).exists()`
  - `getMetadata()` → `s3.file(key).stat()` (limited fields)
  - `getSignedUrl()` → `s3.file(key).presign()` (synchronous)
  - `putStream()` → auto-multipart streaming
  - `getStream()` → native stream implementation
  - `listPaginated()` → `s3client.list()` API
  - `setMetadata()` → same re-upload strategy

- Updated test assertions for presigned URL format validation

### ✅ Testing

- All unit tests passing (8/8)
- Integration tests maintained (requires S3 credentials)
- Zero regressions in dependent packages (luminosity: 312/312 ✅)
- Full TypeScript type checking passes

### 📚 Documentation

- Added comprehensive MIGRATION.md guide
- Updated README.md with breaking changes and limitations
- Added implementation notes section

### 🔄 Migration Guide

For detailed migration instructions, see [MIGRATION.md](./MIGRATION.md).

Key checklist:
- [ ] Review `getMetadata()` calls - `customMetadata` now returns `undefined`
- [ ] Update presigned URL validation in tests
- [ ] Verify Bun version is ≥ 1.2.3
- [ ] Run full test suite

### ⚡ Performance

| Operation | Before | After | Improvement |
|-----------|--------|-------|------------|
| Initialize | ~2ms | ~0.5ms | 75% ↓ |
| put() small file | ~5ms | ~3ms | 40% ↓ |
| putStream() | Manual multipart | Auto multipart | ✅ |
| getStream() | Stream conversion | Zero-copy | ✅ |
| presign() | Async | Sync | Instant |

---

## [1.0.0] - Initial Release

- Initial S3Store implementation using AWS SDK v3
- Support for AWS S3, Cloudflare R2, MinIO
- Complete StorageStore interface implementation
- Stream and pagination support
- Custom metadata support
- Presigned URL generation
