# Dependency Validation Results

**Generated:** 2026-03-24
**Tool:** `bun run scripts/generate-dependency-graph.ts`

## Summary

| Metric | Value | Status |
|--------|-------|--------|
| Total packages | 59 | OK |
| Code dependencies | 62 | OK |
| Implicit dependencies | 4 | WARN |
| Circular dependencies | 0 | PASS |
| Isolated packages | 38 | INFO |
| Critical packages | 2 | INFO |
| Workspace install | No changes | PASS |

## Implicit Dependencies (4 packages — need fixing)

These packages import `@gravito/atlas` in source code but don't declare it in `package.json`:

| Package | Imports | Risk |
|---------|---------|------|
| `@gravito/fortify` | `@gravito/atlas` | Medium — auth package needs ORM |
| `@gravito/graphql` | `@gravito/atlas` | Medium — GraphQL resolvers use ORM |
| `@gravito/pulse` | `@gravito/atlas` | Medium — realtime might use ORM |
| `@gravito/spectrum` | `@gravito/atlas` | Medium — analytics might use ORM |

**Impact:** Tree-shaking failures, missing dependencies in deployments, npm publish errors.

**Fix:** Add `"@gravito/atlas": "workspace:*"` to each package's `package.json` dependencies.

## Circular Dependencies

**Status: 0 circular dependencies detected** ✅

Pre-push hook validates circular dependencies. No circular dependencies found in the current codebase.

## Workspace Dependencies

```
bun install --check
Checked 1838 installs across 1929 packages (no changes) [3.76s]
```

All workspace dependencies resolved correctly. No missing or conflicting dependencies.

## Critical Packages

2 packages identified as critical (most depended upon):
- These packages affect many downstream packages when changed

## Isolated Packages (38)

38 packages have no declared dependencies on other gravito packages.
This is expected for leaf packages and external adapters.

## Recommendations

1. **Immediate**: Add `@gravito/atlas` to `package.json` of fortify, graphql, pulse, spectrum
2. **Monitor**: Continue running dependency graph check on each PR
3. **Document**: Explain why satellite packages like graphql need atlas without declaring it

*Validation recorded: 2026-03-24*
