# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-26

### Added
- **Resilience**: Connection retry mechanism with exponential backoff strategy.
- **Health Check**: New `ensureConnected()` and `getHealthStatus()` methods.
- **Transactions**: Full ACID transaction support via `withTransaction()`.
- **Bulk Operations**: New `bulkWrite()` method for high-performance batch updates.
- **Monitoring**: Connection pool metrics via `MongoPoolMonitor`.
- **Validation**: Schema validation support in `createCollection` and `setValidation`.
- **Real-time**: Change Streams support via `watch()` method.
- **Storage**: GridFS support for handling large files.

### Changed
- **Type Safety**: Enhanced internal type definitions, removing `any` usage.
- **Performance**: Optimized `ObjectId` loading to reduce overhead in `find()`.
- **Documentation**: Comprehensive JSDoc annotations for all public APIs.

### Fixed
- Fixed logic issue in `toFilter()` when using only `orWhere` conditions.
