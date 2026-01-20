# example-ecommerce-mvc

## 1.1.3

### Patch Changes

- Updated dependencies [7711324]
  - @gravito/constellation@3.0.2

## 1.1.2

### Patch Changes

- Updated dependencies
- Updated dependencies
- Updated dependencies
  - @gravito/atlas@2.1.0
  - @gravito/constellation@3.0.1
  - @gravito/core@1.2.1
  - @gravito/cosmos@3.0.1
  - @gravito/ion@3.0.1
  - @gravito/mass@3.0.1
  - @gravito/monolith@3.0.1
  - @gravito/prism@3.0.1
  - @gravito/pulsar@3.0.1
  - @gravito/sentinel@3.0.1
  - @gravito/stasis@3.0.1

## 1.1.1

### Patch Changes

- Updated dependencies
  - @gravito/core@1.2.0
  - @gravito/atlas@1.2.0
  - @gravito/sentinel@3.0.0
  - @gravito/constellation@3.0.0
  - @gravito/cosmos@3.0.0
  - @gravito/ion@3.0.0
  - @gravito/mass@3.0.0
  - @gravito/monolith@3.0.0
  - @gravito/prism@3.0.0
  - @gravito/pulsar@3.0.0
  - @gravito/stasis@3.0.0

## 1.1.0

### Minor Changes

- **Architecture Refactoring**: Restructured project to follow Enterprise MVC pattern
  - Added `config/` directory for centralized configuration
  - Implemented Service Provider pattern with `Providers/`
  - Created `bootstrap.ts` with 4-phase initialization lifecycle
  - Reorganized HTTP layer: `Http/Controllers/`, `Http/Requests/`, `Http/Middleware/`
  - Added `routes.ts` for centralized route definitions
  - Created `database/migrations/` and `database/seeders/` structure
  - Added `Services/` and `Repositories/` directories for future use
  - Simplified `index.ts` to only handle application launch
  - Added comprehensive `ARCHITECTURE.md` documentation

## 1.0.3

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @gravito/core@1.1.0
  - @gravito/mass@2.0.0
  - @gravito/monolith@2.0.0
  - @gravito/prism@2.0.0
  - @gravito/sentinel@2.0.0

## 1.0.2

### Patch Changes

- Updated dependencies
  - @gravito/atlas@1.0.1
  - @gravito/core@1.0.0
  - @gravito/mass@1.0.0
  - @gravito/monolith@1.0.0
  - @gravito/prism@1.0.0
  - @gravito/sentinel@1.0.0

## 1.0.1

### Patch Changes

- Updated dependencies [bc76ff3]
  - @gravito/atlas@1.0.0
