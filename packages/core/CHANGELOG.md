# Changelog

## 1.7.0 (2026-02-25)

### Deprecations

- **refactor: Mark HTTP middleware exports as `@deprecated` (v2.0.0)**
  - `cors`, `csrfProtection`, `getCsrfToken`, `securityHeaders`, `bodySizeLimit`, `requireHeaderToken`, `createHeaderGate`, `ThrottleRequests` are now deprecated
  - All HTTP security middleware migrated to `@gravito/photon/middleware/security`
  - Existing exports remain functional but will be removed in the next MAJOR version
  - Migration: Replace `import { cors } from '@gravito/core'` with `import { cors } from '@gravito/photon/middleware/security'`
  - See `@gravito/photon` CHANGELOG for migration guide and API changes

## 1.6.1

### Patch Changes

- Convert all workspace:\* dependencies to version numbers for npm publishing

  - Fixed 144 workspace:\* dependencies across 58 packages
  - Ensures all packages work properly when installed from npm
  - Resolves issues with bunx and npm installation of CLI tools
  - All internal dependencies now use explicit version constraints

- Updated dependencies
  - @gravito/photon@1.0.1

## 1.6.0 (2026-01-31)

### Minor Changes

- **feat: 新增 routePattern 支援防止 metrics 高基數問題**
  - 新增 `FastRequest.routePattern` 和 `GravitoRequest.routePattern` 屬性
  - 更新 `FastContext` 和 `MinimalContext` 支援 routePattern 傳遞
  - 修改 `AOTRouter` 追蹤並返回動態路由的 pattern
  - 靜態路由的 routePattern 等於 path
  - 動態路由的 routePattern 包含參數模式（如 `/users/:id`）

### Patch Changes

- **fix: 修復指標基數爆炸風險（CRITICAL）**
  - AOTRouter 現在正確追蹤並返回路由模式
  - Gravito.ts 在初始化 context 時傳遞 routePattern
  - 完全防止動態路徑導致的 Prometheus 指標無限增長

## 1.3.0

### Minor Changes

- feat: implement ServiceMap for type-safe IoC resolution
- feat: implement CommandKernel for structured CLI command handling
- feat: implement circular dependency detection in Container

## 1.2.1

### Patch Changes

- 修復 Router.ts 中可能的 undefined 問題

## 1.2.0

### Minor Changes

- Implement several more examples and fix module issues, including:
  - Support middleware in core route definitions.
  - Improve Atlas driver loading and dependency injection.
  - Add PostgreSQL support to Ecommerce MVC example.
  - Fix internal type resolution issues across packages.

## 1.1.0

### Minor Changes

- Launch standalone high-performance engine and core optimizations.

### Patch Changes

- q

## 1.0.0

### Patch Changes

- Improve database grammar, core runtime types, and scaffolding generators.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial project setup

## [0.0.0] - YYYY-MM-DD

### Added

- Initial release
