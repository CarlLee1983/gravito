# Phase 1: Code Quality & Architecture

> Refactor monolithic structure and improve maintainability

## Overview

The current `FormRequest.ts` (632 lines) contains all validation logic in a single file. This phase focuses on breaking it into focused, testable modules.

## Current Architecture Issues

### 1. Monolithic File Structure
```
src/
├── FormRequest.ts     # 632 lines - Everything!
└── index.ts          # 23 lines - Exports
```

**Problems:**
- Single responsibility principle violation
- Hard to test individual components
- Difficult to extend or modify specific features
- Poor separation of concerns

### 2. Mixed Responsibilities
The `FormRequest` class currently handles:
- Schema validation (Zod/Valibot)
- Data extraction (`getData`)
- Error message resolution (`getErrorMessage`)
- Authorization (`authorize`)
- Blueprint generation (`getBlueprint`)

## Target Architecture

### New File Structure
```
src/
├── core/
│   ├── FormRequest.ts         # Core abstract class (~150 lines)
│   ├── DataExtractor.ts       # Data source handling (~80 lines)
│   └── MessageProvider.ts     # Error message resolution (~60 lines)
├── validation/
│   ├── SchemaValidator.ts     # Schema validation logic (~120 lines)
│   ├── ZodValidator.ts        # Zod-specific implementation (~80 lines)
│   └── ValibotValidator.ts    # Valibot-specific implementation (~80 lines)
├── blueprint/
│   └── BlueprintGenerator.ts  # Frontend metadata extraction (~100 lines)
├── middleware/
│   └── validateRequest.ts     # Middleware factory (~50 lines)
└── index.ts                   # Public exports (~30 lines)
```

## Implementation Tasks

### Task 1.1: Extract Data Extraction Logic
**File**: `src/core/DataExtractor.ts`

```typescript
export class DataExtractor {
  static async extractData(ctx: Context, source: DataSource): Promise<unknown>
  static extractJson(ctx: Context): Promise<unknown>
  static extractForm(ctx: Context): Promise<unknown>
  static extractQuery(ctx: Context): Promise<unknown>
  static extractParams(ctx: Context): Promise<unknown>
}
```

### Task 1.2: Create Schema Validation Abstraction
**File**: `src/validation/SchemaValidator.ts`

```typescript
export interface SchemaValidationResult {
  success: boolean
  data?: unknown
  errors?: ValidationError[]
}

export abstract class SchemaValidator {
  abstract validate(schema: unknown, data: unknown): SchemaValidationResult
  abstract isSupported(schema: unknown): boolean
}
```

### Task 1.3: Implement Validator Strategies
- **ZodValidator**: Handles Zod schema validation
- **ValibotValidator**: Handles Valibot schema validation

### Task 1.4: Extract Message Provider
**File**: `src/core/MessageProvider.ts`

```typescript
export class MessageResolver {
  static resolve(
    field: string,
    code: string | undefined,
    defaultMessage: string,
    customMessages?: Record<string, string>,
    provider?: MessageProvider
  ): string
}
```

### Task 1.5: Extract Blueprint Generation
**File**: `src/blueprint/BlueprintGenerator.ts`

```typescript
export class BlueprintGenerator {
  static generate(schema: unknown): Record<string, any>
  static generateFromZod(schema: ZodSchema): Record<string, any>
  static generateFromValibot(schema: ValibotSchema): Record<string, any>
}
```

### Task 1.6: Refactor Core FormRequest
**File**: `src/core/FormRequest.ts`

The new `FormRequest` becomes a composition of the extracted components:

```typescript
export abstract class FormRequest<T = unknown> {
  abstract schema: T
  source: DataSource = 'json'
  options: FormRequestOptions = {}

  async validate(ctx: Context): Promise<ValidationResult> {
    // Compose extracted components
    const data = await DataExtractor.extractData(ctx, this.source)
    const result = this.getValidator().validate(this.schema, data)
    // ... rest of logic
  }

  private getValidator(): SchemaValidator {
    // Factory pattern for validator selection
  }
}
```

## Benefits

### 1. Single Responsibility
Each class/module has one clear purpose:
- `DataExtractor`: Handle different data sources
- `SchemaValidator`: Schema validation logic
- `MessageResolver`: Error message resolution
- `BlueprintGenerator`: Metadata extraction

### 2. Testability
- Each component can be unit tested in isolation
- Easier to mock dependencies
- Clear input/output boundaries

### 3. Extensibility
- Easy to add new schema libraries (Joi, Yup, etc.)
- Simple to add new data sources
- Pluggable message providers

### 4. Performance
- Validator instances can be cached
- Schema type detection can be optimized
- Blueprint generation can be memoized

## Migration Strategy

### Backward Compatibility
- Keep existing public API unchanged
- Export original `FormRequest` class
- Internal refactoring only

### Implementation Steps
1. Create new file structure
2. Extract components one by one
3. Update FormRequest to use extracted components
4. Add comprehensive tests for each component
5. Ensure all existing tests pass

## Testing Strategy

### Unit Tests for Each Component
```typescript
// DataExtractor.test.ts
describe('DataExtractor', () => {
  it('should extract JSON data correctly')
  it('should handle malformed JSON gracefully')
  it('should extract form data with file uploads')
})

// ZodValidator.test.ts
describe('ZodValidator', () => {
  it('should validate Zod schemas')
  it('should return proper error format')
})
```

### Integration Tests
- Ensure refactored FormRequest works identically to original
- Test all data source combinations
- Verify error message resolution

## Success Criteria

- [ ] All 632 lines distributed across focused modules
- [ ] Each module has < 150 lines
- [ ] All existing tests pass without modification
- [ ] New unit tests achieve 95%+ coverage on each module
- [ ] Public API remains unchanged
- [ ] Performance benchmarks show no regression

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking changes | High | Maintain 100% API compatibility |
| Performance regression | Medium | Benchmark each component |
| Test failures | Medium | Run full test suite after each extraction |

---

**Next**: [Phase 2: Type Safety & DX](./PHASE-2-TYPE-SAFETY.md)