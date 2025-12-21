# Phase 2 Rebranding Assessment: Data & Cache Modules

## Overview

Phase 2 focuses on renaming data storage and cache modules. This phase involves **8 modules** with **213 references across 104 files**, making it more complex than Phase 1.

## Modules to Rename

### Data Storage Modules (3 modules)

1. **`@gravito/orbit-db` → `@gravito/matter`**
   - **Type**: SQL Database / ORM (Drizzle-based)
   - **Complexity**: ⚠️ **HIGH**
   - **Dependencies**: `gravito-core`, `drizzle-orm`
   - **Used by**: Many examples, templates, CLI, docs
   - **Note**: Uses Drizzle ORM, provides Eloquent-like Model API

2. **`@gravito/orbit-database` → `@gravito/matter`**
   - **Type**: Database abstraction layer (Custom Query Builder)
   - **Complexity**: ⚠️ **HIGH**
   - **Dependencies**: `pg`, `mysql2`, `better-sqlite3` (optional)
   - **Used by**: CLI, some examples
   - **⚠️ CRITICAL**: Both `orbit-db` and `orbit-database` map to `@gravito/matter`!
   - **Decision needed**: Should these be merged or kept separate with different names?

3. **`@gravito/orbit-mongo` → `@gravito/dark-matter`**
   - **Type**: MongoDB / NoSQL
   - **Complexity**: 🟢 **MEDIUM**
   - **Dependencies**: MongoDB driver
   - **Used by**: Fewer references

### Cache Modules (2 modules)

4. **`@gravito/orbit-redis` → `@gravito/plasma`**
   - **Type**: Redis cache client
   - **Complexity**: 🟢 **MEDIUM**
   - **Dependencies**: `ioredis` (optional peer)
   - **Used by**: `orbit-cache`, `orbit-session`, some examples
   - **Note**: Peer dependency of `orbit-cache`

5. **`@gravito/orbit-cache` → `@gravito/stasis`**
   - **Type**: Static cache (File/Internal)
   - **Complexity**: 🟡 **MEDIUM-HIGH**
   - **Dependencies**: `gravito-core`, `@gravito/orbit-redis` (peer)
   - **Used by**: Many examples, templates, docs
   - **⚠️ IMPORTANT**: Has peer dependency on `orbit-redis` → needs to be updated to `@gravito/plasma`

### Storage & Content Modules (2 modules)

6. **`@gravito/orbit-storage` → `@gravito/nebula`**
   - **Type**: File storage / OSS
   - **Complexity**: 🟢 **MEDIUM**
   - **Dependencies**: `gravito-core`
   - **Used by**: Examples, templates, docs

7. **`@gravito/orbit-content` → `@gravito/nebula-content`**
   - **Type**: Content management system
   - **Complexity**: 🟢 **MEDIUM**
   - **Dependencies**: `gravito-core`, `marked`, `gray-matter`
   - **Used by**: Site package, examples

### Session Module (1 module)

8. **`@gravito/orbit-session` → `@gravito/orbit`**
   - **Type**: Session management
   - **Complexity**: 🟡 **MEDIUM**
   - **Dependencies**: `gravito-core`, `@gravito/orbit-redis` (optional)
   - **Used by**: Examples, templates, docs
   - **⚠️ NOTE**: This is a special case - renames to just `@gravito/orbit` (not `@gravito/orbit-*`)

## Critical Issues

### 1. Name Conflict: `orbit-db` vs `orbit-database`

**Problem**: Both modules map to `@gravito/matter` according to `rename-mapping.json`.

**Options**:
- **Option A**: Merge both into `@gravito/matter` (requires code consolidation)
- **Option B**: Keep separate with different names:
  - `orbit-db` → `@gravito/matter` (Drizzle-based)
  - `orbit-database` → `@gravito/matter-query` or `@gravito/matter-builder` (Query Builder)
- **Option C**: Deprecate one in favor of the other

**Recommendation**: **Option B** - Keep separate with `@gravito/matter-query` for the query builder, as they serve different use cases.

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
1. ✅ `orbit-redis` → `plasma` (foundation for cache)
2. ✅ `orbit-mongo` → `dark-matter` (isolated)

### Batch 2: Cache System (Medium Risk)
3. ✅ `orbit-cache` → `stasis` (depends on plasma)
4. ✅ `orbit-session` → `orbit` (may use plasma)

### Batch 3: Storage (Medium Risk)
5. ✅ `orbit-storage` → `nebula`
6. ✅ `orbit-content` → `nebula-content`

### Batch 4: Database (High Risk - Requires Decision)
7. ⚠️ `orbit-db` → `matter` (Drizzle-based)
8. ⚠️ `orbit-database` → `matter-query` or merge decision

## Risk Assessment

| Module | Risk Level | Reason |
|--------|-----------|--------|
| `orbit-redis` → `plasma` | 🟢 Low | Few dependencies, isolated |
| `orbit-mongo` → `dark-matter` | 🟢 Low | Few references |
| `orbit-cache` → `stasis` | 🟡 Medium | Many references, peer dependency |
| `orbit-session` → `orbit` | 🟡 Medium | Many references, optional redis dependency |
| `orbit-storage` → `nebula` | 🟢 Low-Medium | Moderate references |
| `orbit-content` → `nebula-content` | 🟢 Low-Medium | Moderate references |
| `orbit-db` → `matter` | 🔴 High | **Many references (104 files), core functionality** |
| `orbit-database` → `matter-query` | 🔴 High | **Name conflict resolution needed** |

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

1. ✅ **DECISION NEEDED**: Resolve `orbit-db` vs `orbit-database` naming conflict
2. ✅ Verify all tests pass before starting
3. ✅ Create backup branch
4. ✅ Document the decision on database module naming

## Next Steps

1. Get approval on database module naming strategy
2. Start with Batch 1 (low-risk modules)
3. Progressively move to higher-risk modules
4. Test thoroughly after each batch

