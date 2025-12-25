# Phase 2 Rebranding Assessment: Data & Cache Modules

## Overview

Phase 2 focuses on renaming data storage and cache modules. This phase involves **8 modules** with **213 references across 104 files**, making it more complex than Phase 1.

## Modules to Rename

### Data Storage Modules (3 modules)

1. **`@gravito/atlas` → ⚠ DEPRECATED**
   - **Type**: SQL Database / ORM (Drizzle-based)
   - **Status**:  **DEPRECATED** - Will be phased out
   - **Complexity**: ⚠ **HIGH**
   - **Dependencies**: `gravito-core`, `drizzle-orm`
   - **Used by**: Some examples, templates, CLI, docs (needs migration)
   - **Note**: Uses Drizzle ORM, provides Eloquent-like Model API
   - **Action**: Mark as deprecated, migrate users to `orbit-database` → `matter`
   - **Decision needed**: Should we rename it to `@gravito/matter-deprecated` or keep old name with deprecation notice?

2. **`@gravito/orbit-database` → `@gravito/matter`** [Complete] **PRIMARY**
   - **Type**: Database abstraction layer (Custom Query Builder) - **This is the main module**
   - **Complexity**: ⚠ **HIGH**
   - **Dependencies**: `pg`, `mysql2`, `better-sqlite3` (optional)
   - **Used by**: CLI, examples, core functionality
   - **Status**: [Complete] **ACTIVE** - This is the module to use going forward

3. **`@gravito/orbit-mongo` → `@gravito/dark-matter`**
   - **Type**: MongoDB / NoSQL
   - **Complexity**:  **MEDIUM**
   - **Dependencies**: MongoDB driver
   - **Used by**: Fewer references

### Cache Modules (2 modules)

4. **`@gravito/orbit-redis` → `@gravito/plasma`**
   - **Type**: Redis cache client
   - **Complexity**:  **MEDIUM**
   - **Dependencies**: `ioredis` (optional peer)
   - **Used by**: `orbit-cache`, `orbit-session`, some examples
   - **Note**: Peer dependency of `orbit-cache`

5. **`@gravito/stasis` → `@gravito/stasis`**
   - **Type**: Static cache (File/Internal)
   - **Complexity**:  **MEDIUM-HIGH**
   - **Dependencies**: `gravito-core`, `@gravito/orbit-redis` (peer)
   - **Used by**: Many examples, templates, docs
   - **⚠ IMPORTANT**: Has peer dependency on `orbit-redis` → needs to be updated to `@gravito/plasma`

### Storage & Content Modules (2 modules)

6. **`@gravito/orbit-storage` → `@gravito/nebula`**
   - **Type**: File storage / OSS
   - **Complexity**:  **MEDIUM**
   - **Dependencies**: `gravito-core`
   - **Used by**: Examples, templates, docs

7. **`@gravito/orbit-content` → `@gravito/nebula-content`**
   - **Type**: Content management system
   - **Complexity**:  **MEDIUM**
   - **Dependencies**: `gravito-core`, `marked`, `gray-matter`
   - **Used by**: Site package, examples

### Session Module (1 module)

8. **`@gravito/ion` → `@gravito/orbit`**
   - **Type**: Session management
   - **Complexity**:  **MEDIUM**
   - **Dependencies**: `gravito-core`, `@gravito/orbit-redis` (optional)
   - **Used by**: Examples, templates, docs
   - **⚠ NOTE**: This is a special case - renames to just `@gravito/orbit` (not `@gravito/orbit-*`)

## Critical Issues

### 1. Deprecation: `Atlas` → `orbit-database`

**Status**: `Atlas` is **DEPRECATED**. `orbit-database` is the **PRIMARY** module.

**Decision needed for `Atlas`**:
- **Option A**: Keep old name `@gravito/atlas` with deprecation notice (recommended for backward compatibility)
- **Option B**: Rename to `@gravito/matter-deprecated` to clearly indicate status
- **Option C**: Remove entirely (not recommended - breaks existing code)

**Recommendation**: **Option A** - Keep `@gravito/atlas` name but add deprecation warnings, guide users to migrate to `@gravito/matter` (`orbit-database`).

**Action for `orbit-database`**: 
- [Complete] Rename to `@gravito/matter` (this is the primary module)

### 2. Dependency Chain

**Critical dependency order**:
1. First rename `orbit-redis` → `plasma` (foundation)
2. Then rename `orbit-cache` → `stasis` (depends on redis)
3. Then rename `orbit-session` → `orbit` (may use redis)

### 3. Peer Dependencies

- `orbit-cache` has `@gravito/orbit-redis` as peer dependency → must update to `@gravito/plasma`
- `orbit-session` optionally uses `@gravito/orbit-redis` → must update to `@gravito/plasma`

## Recommended Renaming Order

### Batch 1: Foundation (Low Risk)
1. [Complete] `orbit-redis` → `plasma` (foundation for cache)
2. [Complete] `orbit-mongo` → `dark-matter` (isolated)

### Batch 2: Cache System (Medium Risk)
3. [Complete] `orbit-cache` → `stasis` (depends on plasma)
4. [Complete] `orbit-session` → `orbit` (may use plasma)

### Batch 3: Storage (Medium Risk)
5. [Complete] `orbit-storage` → `nebula`
6. [Complete] `orbit-content` → `nebula-content`

### Batch 4: Database (High Risk)
7. [Complete] `orbit-database` → `matter` (PRIMARY - Custom Query Builder)
8. ⚠ `Atlas` → Handle deprecation (keep name or rename to `matter-deprecated`)

## Risk Assessment

| Module | Risk Level | Reason |
|--------|-----------|--------|
| `orbit-redis` → `plasma` |  Low | Few dependencies, isolated |
| `orbit-mongo` → `dark-matter` |  Low | Few references |
| `orbit-cache` → `stasis` |  Medium | Many references, peer dependency |
| `orbit-session` → `orbit` |  Medium | Many references, optional redis dependency |
| `orbit-storage` → `nebula` |  Low-Medium | Moderate references |
| `orbit-content` → `nebula-content` |  Low-Medium | Moderate references |
| `orbit-database` → `matter` |  High | **Many references (104 files), PRIMARY module** |
| `Atlas` (deprecated) |  Medium | **Deprecation handling, migration needed** |

## File Impact Analysis

- **Total references**: 213 matches across 104 files
- **Most affected areas**:
  - Examples (1.5-example, official-site)
  - Templates (basic, inertia-react, static-site)
  - CLI commands and stubs
  - Documentation (API docs, guides)
  - Package dependencies

## Testing Strategy

1. **Unit Tests**: Run tests for each module after renaming
2. **Integration Tests**: Test modules that depend on renamed modules
3. **Example Verification**: Ensure all examples still work
4. **Build Verification**: Ensure all packages build successfully

## Estimated Timeline

- **Batch 1** (redis, mongo): 1-2 hours
- **Batch 2** (cache, session): 2-3 hours
- **Batch 3** (storage, content): 2-3 hours
- **Batch 4** (database modules): 3-4 hours (requires decision on conflict)
- **Total**: 8-12 hours

## Action Items Before Starting

1. [Complete] **DECISION NEEDED**: How to handle deprecated `Atlas`?
   - Option A: Keep name with deprecation notice (recommended)
   - Option B: Rename to `@gravito/matter-deprecated`
   - Option C: Remove (not recommended)
2. [Complete] Verify all tests pass before starting
3. [Complete] Create backup branch
4. [Complete] Document migration path from `Atlas` to `orbit-database` → `matter`

## Next Steps

1. Get approval on database module naming strategy
2. Start with Batch 1 (low-risk modules)
3. Progressively move to higher-risk modules
4. Test thoroughly after each batch

