# Model.ts Refactoring Plan

## Status: Phase 1 Complete - Concerns Created ✅

## Overview
Model.ts (1597 lines) is being refactored into modular concerns following the composition-over-inheritance pattern.

## Completed Concerns ✅

### 1. HasAttributes (~280 lines)
- **Location**: `packages/atlas/src/orm/model/concerns/HasAttributes.ts`
- **Responsibilities**:
  - Getting and setting attributes
  - Attribute casting (int, string, boolean, json, date, etc.)
  - Dirty tracking integration
  - Attribute validation
  - Type inference and checking

### 2. HasRelationships (~200 lines)
- **Location**: `packages/atlas/src/orm/model/concerns/HasRelationships.ts`
- **Responsibilities**:
  - hasOne, hasMany, belongsTo relationships
  - belongsToMany (many-to-many) relationships
  - Morph relationships (morphOne, morphMany, morphTo)
  - Eager loading (load method)
  - Query builder integration

### 3. HasPersistence (~300 lines)
- **Location**: `packages/atlas/src/orm/model/concerns/HasPersistence.ts`
- **Responsibilities**:
  - Save operations (insert/update)
  - Delete operations (soft/hard)
  - Restore soft-deleted records
  - Refresh from database
  - Lifecycle events integration

### 4. HasEvents (~40 lines)
- **Location**: `packages/atlas/src/orm/model/concerns/HasEvents.ts`
- **Responsibilities**:
  - Model observer registration
  - Event emission (creating, created, updating, updated, deleting, deleted)
  - Static event firing

### 5. HasSerialization (~90 lines)
- **Location**: `packages/atlas/src/orm/model/concerns/HasSerialization.ts`
- **Responsibilities**:
  - JSON conversion
  - Array/Object conversion
  - Attribute hiding/visibility
  - Attribute appending
  - Custom accessors

### 6. applyMixins (~25 lines)
- **Location**: `packages/atlas/src/orm/model/concerns/applyMixins.ts`
- **Purpose**: Utility to compose multiple concerns into a single class

---

## Phase 2: Integration Plan 📋

### Step 1: Prepare Model.ts for Composition
```typescript
// packages/atlas/src/orm/model/Model.ts

// Import concerns
import { 
  applyMixins,
  HasAttributes,
  HasEvents,
  HasPersistence, 
  HasRelationships,
  HasSerialization
} from './concerns'

// Simplified Model base class (core only)
abstract class ModelBase {
  // Static Configuration
  static table: string
  static primaryKey = 'id'
  static timestamps: boolean | 'created_only' = true
  static casts: Record<string, string> = {}
  // ... other static configs

  // Only keep Proxy Factory and Factory integration
  protected _createProxy(...)
  static make(...)
  static create(...)
  static hydrate(...)
}

// Apply mixins
export abstract class Model extends applyMixins(
  ModelBase,
  [HasAttributes, HasEvents, HasPersistence, HasRelationships, HasSerialization]
) {}
```

### Step 2: Remove Duplicated Code
- Remove methods from Model.ts that are now in concerns
- Keep only core functionality (Proxy Factory, Factory integration)
- Update method signatures as needed

### Step 3: Update Model Index
- Already done ✅
- Concerns are exported from `packages/atlas/src/orm/model/index.ts`

### Step 4: Test Integration
```bash
cd packages/atlas
bun test
```

---

## Phase 3: Static Query Methods Migration 📋

The following static query methods remain in Model.ts and should be extracted:

| Method | Current Lines | Suggested Module |
|--------|--------------|------------------|
| query() | ~50 | StaticQueries concern |
| first() | ~20 | StaticQueries concern |
| find() | ~30 | StaticQueries concern |
| findOrFail() | ~25 | StaticQueries concern |
| all() | ~20 | StaticQueries concern |
| createAndSave() | ~30 | StaticQueries concern |
| lazyAll() | ~30 | LazyQueries concern |
| cursor() | ~40 | Cursor concern |
| count() | ~15 | Aggregations concern |
| exists() | ~15 | Aggregations concern |
| where() | ~20 | QueryHelpers concern |
| whereIn() | ~15 | QueryHelpers concern |
| whereNull() | ~15 | QueryHelpers concern |
| whereNotNull() | ~15 | QueryHelpers concern |
| orderBy() | ~15 | QueryHelpers concern |
| limit() | ~15 | QueryHelpers concern |
| offset() | ~15 | QueryHelpers concern |
| select() | ~15 | QueryHelpers concern |
| with() | ~20 | EagerLoading concern |
| latest() | ~15 | QueryHelpers concern |
| oldest() | ~15 | QueryHelpers concern |

**Estimated Total**: ~420 lines to extract

---

## Phase 4: Proxy Factory Analysis 🔍

The Proxy Factory is the core of Model.ts (~227 lines). It should remain in Model.ts as it's essential to the "Smart Guard" pattern.

**Key Components**:
1. **Property Resolution Order**:
   - Internal properties (_*)
   - Constructor
   - Instance getters/methods
   - Accessor methods (get[Name]Attribute)
   - Attributes from _attributes
   - Relationship builders
   - Instance values
   - Static properties

2. **Thenable Support**:
   - Enables `await user.posts` syntax
   - Critical for lazy loading UX

3. **Type Preservation**:
   - Maintains class identity
   - Preserves TypeScript types

**Recommendation**: Keep in Model.ts as core functionality (~200-250 lines)

---

## Expected Final Structure

After complete refactoring:

```
Model.ts (~300-400 lines)
├── Static Configuration
├── Instance State
└── Proxy Factory (core only)

Concerns/ (~900-1000 lines total)
├── HasAttributes.ts (~280)
├── HasEvents.ts (~40)
├── HasPersistence.ts (~300)
├── HasRelationships.ts (~200)
├── HasSerialization.ts (~90)
├── StaticQueries.ts (~150) [new]
├── QueryHelpers.ts (~100) [new]
├── Aggregations.ts (~50) [new]
└── EagerLoading.ts (~50) [new]

Total: ~1200-1500 lines (vs 1597 current)
Reduction: ~100-400 lines
```

---

## Testing Strategy

1. **Before Refactoring**:
   ```bash
   cd packages/atlas
   bun test
   # ✅ Currently passing: 310 tests
   ```

2. **After Each Concern Migration**:
   - Run full test suite
   - Verify backward compatibility
   - Check for type errors

3. **Integration Testing**:
   - Test Model creation
   - Test CRUD operations
   - Test relationships
   - Test serialization
   - Test events

---

## Migration Checklist

### Phase 1 (Completed ✅)
- [x] Create HasAttributes concern
- [x] Create HasRelationships concern
- [x] Create HasPersistence concern
- [x] Create HasEvents concern
- [x] Create HasSerialization concern
- [x] Create applyMixins utility
- [x] Export concerns from index

### Phase 2 (Pending)
- [ ] Create ModelBase with core functionality
- [ ] Apply mixins to Model class
- [ ] Remove duplicated methods from Model.ts
- [ ] Test integration
- [ ] Fix any breaking changes

### Phase 3 (Pending)
- [ ] Create StaticQueries concern
- [ ] Create QueryHelpers concern
- [ ] Create Aggregations concern
- [ ] Create EagerLoading concern
- [ ] Migrate static methods to concerns
- [ ] Update Model class
- [ ] Test all concerns

### Phase 4 (Pending)
- [ ] Verify all tests pass
- [ ] Check TypeScript types
- [ ] Update documentation
- [ ] Update examples
- [ ] Performance benchmarking

---

## Notes

### Compatibility
- **Backward Compatible**: Yes, all existing APIs remain the same
- **Breaking Changes**: None expected
- **Type Safety**: Maintained through proper typing

### Performance
- **Impact**: Minimal (composition has negligible overhead vs inheritance)
- **Benefits**: Better code organization, easier testing, easier maintenance

### Future Enhancements
- Easy to add new concerns (e.g., HasCaching, HasValidation)
- Better separation of concerns
- More testable code
- Easier to understand and maintain

---

**Created**: 2026-01-17
**Last Updated**: 2026-01-17
**Status**: Phase 1 Complete - Ready for Phase 2
