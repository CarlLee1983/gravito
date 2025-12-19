# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0-alpha.1] - 2024-12-16

### Added

- **IoC Container Architecture**
  - `PlanetCore.boot(config)` - Bootstrap application with configuration
  - `defineConfig()` - Type-safe configuration helper
  - `GravitoOrbit` interface for plugin modules

- **Orbit System (Plugin Architecture)**
  - `@gravito/orbit-db` - Database injection
  - `@gravito/orbit-cache` - Memory cache with TTL
  - `@gravito/orbit-storage` - Local file storage
  - `@gravito/orbit-auth` - JWT authentication

- **Hook System**
  - `hooks.addAction()` - Register side-effect callbacks
  - `hooks.addFilter()` - Register data transformation callbacks
  - `hooks.doAction()` - Trigger actions
  - `hooks.applyFilters()` - Apply filter chain

- **CLI Tool**
  - `gravito create [name]` - Scaffold new Gravito project

- **Basic Template**
  - Complete demo with static website
  - Visitor counter using OrbitCache
  - API endpoints with hook integration

### Fixed

- OrbitCache config resolution when no config provided
- Hono Context type safety with custom Variables

### Technical

- Strict TypeScript mode enabled
- Biome linter integration
- 100% test coverage on core module

## [0.1.0] - 2024-12-01

### Added

- Initial release with basic PlanetCore
- Hono integration
- ConfigManager
- HookManager
- ConsoleLogger

[0.3.0-alpha.1]: https://github.com/gravito-framework/gravito/compare/v0.1.0...v0.3.0-alpha.1
[0.1.0]: https://github.com/gravito-framework/gravito/releases/tag/v0.1.0
