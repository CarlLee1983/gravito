# Phase 31: Dependency Graph Tooling - Research

**Researched:** 2026-03-31
**Domain:** CLI command hardening, DOT graph generation, publint export validation
**Confidence:** HIGH

## Summary

Phase 31 is a finishing phase, not a greenfield build. The `deps:graph` command is already functional — `depsGraph.ts` exists, is wired into `index.ts`, exports from `commands/index.ts`, and passes the single regression test in `deps-graph.test.ts`. `PlanetCore.installedOrbits` provides the runtime graph source with no additional discovery mechanism required.

The phase has two non-overlapping work streams. First, hardening the existing command: improving project-root entry discovery, strengthening error handling, and expanding test coverage (DOT format is untested, error paths are untested, the `--entry` override with project-root default is untested). Second, publint export hygiene: `@gravito/photon` has ~70 numbered `publint` errors (all caused by `types` not being first in exports condition objects), which the milestone success criteria explicitly require to be clean before Phase 31 is considered done.

**Primary recommendation:** Harden `depsGraph.ts` with improved discovery and DOT output test coverage, then fix `@gravito/photon` exports map ordering. Both streams are independent and can be planned as separate tasks.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** `PlanetCore.installedOrbits` is the canonical runtime graph source — it records each registered orbit/plugin name plus its `dependencies` array.
- **D-02:** Dependency edges come from bootstrapped Orbit/Satellite registration state, not from `package.json` dependency metadata. The goal is application coupling, not npm package coupling.
- **D-03:** `gravito deps:graph` remains the user-facing command name.
- **D-04:** `dot` is the default output format; `json` stays available.
- **D-05:** The command should prefer project-root discovery when possible, but keep an `--entry` override for explicit control and legacy app layouts.
- **D-06:** If a project has `gravito.config.ts`, honor it as the canonical config source when present.
- **D-07:** Export hygiene must be validated with `publint` on the modified public packages before Phase 31 is considered complete.
- **D-08:** Any `ERR_PACKAGE_PATH_NOT_EXPORTED` regression is a release blocker.
- **D-09:** `packages/cli/src/commands/depsGraph.ts` is the starting point — harden and finish, not replace.
- **D-10:** `packages/cli/src/commands/index.ts` and `packages/cli/src/index.ts` are the integration points that must remain in sync.

### Claude's Discretion
- Exact DOT styling for nodes, edges, labels, and any grouping/clustering
- Whether JSON output should be a raw `installedOrbits` dump or a normalized graph schema
- Whether to emit SVG as a derived format now or defer it
- Whether the command should print a compact summary alongside the graph payload

### Deferred Ideas (OUT OF SCOPE)
- Static package-level dependency graphing from `package.json`/workspace metadata
- SVG export
- `madge`-backed analysis
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TOOL-01 | Developer can generate application-level Orbit/Satellite dependency graph via CLI command showing module coupling relationships | `depsGraph.ts` already implements `json` and `dot` output from `installedOrbits`. Hardening adds: project-root default entry, DOT test coverage, error-path coverage, and publint clean exit on `@gravito/photon`. |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `bun:test` | built-in | Test framework for CLI command tests | Already used in `deps-graph.test.ts` and all CLI tests |
| `@gravito/core` | workspace:* | `PlanetCore.installedOrbits` — canonical graph source | D-01; no alternative |
| `publint` | 0.3.18 | Package export map validation | Already installed; `bun run publint packages/X` is the lint command |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:path` | built-in | Resolving `--entry` paths relative to `process.cwd()` | Entry discovery |
| `node:fs` | built-in | Checking existence of default entry candidates | Project-root discovery |
| `@gravito/chromatic` | ^1.0.1 | Terminal color output (`pc.cyan`, `pc.green`, `pc.red`) | Already imported in `depsGraph.ts` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Runtime bootstrap approach | `madge` static analysis | `madge` is not installed (deferred); runtime gives application coupling not package coupling (D-02) |
| Manual DOT generation | `graphviz` npm package | No `graphviz` in tree; manual DOT string is 20 lines, no external dep needed |

**Installation:** No new packages needed. All dependencies are already present.

---

## Architecture Patterns

### Existing Command Structure
```
packages/cli/src/
├── commands/
│   ├── depsGraph.ts          # depsGraph(options) — the function to harden
│   └── index.ts              # barrel — exports depsGraph
├── index.ts                  # CAC wiring — deps:graph command at line ~972
├── errors/
│   ├── CliError.ts
│   └── codes.ts              # APP_INSTANCE_NOT_FOUND already defined
```

### Pattern 1: Runtime Entry Discovery (what to add)
**What:** Auto-discover entry file from project root before requiring `--entry`.
**When to use:** Default case — user runs `gravito deps:graph` from project root.
**Example:**
```typescript
// Candidate resolution order (project-root discovery)
const ENTRY_CANDIDATES = [
  'src/index.ts',
  'src/main.ts',
  'app.ts',
  'index.ts',
]

function resolveEntryPath(entry: string): string {
  const cwd = process.cwd()
  const explicit = path.resolve(cwd, entry)
  // If --entry was explicitly provided (non-default), use it directly
  if (entry !== 'src/index.ts') return explicit
  // Walk candidates for project-root default
  for (const candidate of ENTRY_CANDIDATES) {
    const resolved = path.resolve(cwd, candidate)
    if (existsSync(resolved)) return resolved
  }
  return explicit // fall through to original behavior for clear error message
}
```

### Pattern 2: DOT Output with Discretion-Area Styling
**What:** Clean DOT digraph with node color grouping. Claude's discretion covers styling.
**Recommended style (discretion):** Use fillcolor to distinguish orbits with no dependencies (leaf nodes) vs orbits with dependencies (internal nodes). This makes the graph immediately useful for coupling analysis.
**Example:**
```typescript
// Recommended DOT output pattern
let dot = 'digraph GravitoDependencies {\n'
dot += '  rankdir=LR;\n'
dot += '  node [shape=box, style=filled, fontname="Helvetica", fontsize=11];\n'

for (const orbit of orbits) {
  const isLeaf = orbit.dependencies.length === 0
  const color = isLeaf ? '"#c8e6c9"' : '"#e1f5fe"'
  dot += `  "${orbit.name}" [fillcolor=${color}];\n`
  for (const dep of orbit.dependencies) {
    dot += `  "${orbit.name}" -> "${dep}";\n`
  }
}
dot += '}\n'
```

### Pattern 3: publint Export Fix for @gravito/photon
**What:** The `types` condition must be the FIRST key in each exports entry for TypeScript to resolve it correctly.
**Current broken structure:**
```json
{
  ".": {
    "bun": "./dist/index.js",
    "types": "./dist/index.d.ts",
    "default": "./dist/index.js"
  }
}
```
**Correct structure:**
```json
{
  ".": {
    "types": "./dist/index.d.ts",
    "bun": "./dist/index.js",
    "default": "./dist/index.js"
  }
}
```
This fix must be applied to all ~70 affected export entries in `packages/photon/package.json`.

### Anti-Patterns to Avoid
- **Using `madge`:** Not installed, explicitly deferred (D-02), and brings static analysis which contradicts D-02's runtime coupling goal.
- **Replacing the command:** D-09 is explicit — harden the existing `depsGraph.ts`, do not rewrite.
- **Adding new error codes for normal paths:** `APP_INSTANCE_NOT_FOUND` already covers the failure mode. No new error codes needed unless a genuinely new failure mode is introduced.
- **Suppressing `console.log` in tests:** The existing test pattern — capture `console.log` via override — is correct for CLI output tests. Do not change this pattern.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DOT format generation | Custom graph library | Manual string concatenation | DOT is a simple line-oriented format; 20 LOC covers it completely |
| Export map validation | Custom package checker | `publint` (already installed) | `publint` covers all conditions ordering, missing types, and path resolution |
| Test isolation for CLI | Custom test runner | `bun:test` with temp dirs (already pattern in `deps-graph.test.ts`) | Pattern established; use `fs.mkdtemp` + cleanup in `finally` |

**Key insight:** This phase is hardening, not building. The command already works. The work is coverage gaps (DOT format, error paths, entry discovery) and export map correctness.

---

## Runtime State Inventory

> SKIPPED — This is not a rename/refactor/migration phase.

---

## Common Pitfalls

### Pitfall 1: Dynamic Import Caching Between Tests
**What goes wrong:** `import(entryPath)` in `depsGraph.ts` uses Node/Bun module cache. If two tests write different `app.ts` to the same path, the second test may get a cached version of the first.
**Why it happens:** Bun module registry caches by resolved path.
**How to avoid:** Use `fs.mkdtemp` for each test (the `openapi-generate.test.ts` pattern). Each test gets a unique directory. The existing `deps-graph.test.ts` uses a shared `TEST_DIR` — this should be migrated to `mkdtemp` pattern.
**Warning signs:** Second test in a file sees unexpected orbit names from a previous test.

### Pitfall 2: `PlanetCore.installedOrbits` State Pollution Between Tests
**What goes wrong:** `PlanetCore` instances share no state (they are class instances), but if a test reuses the same entry file path (and module cache hits), a previous instance's `installedOrbits` may be read.
**Why it happens:** Same as Pitfall 1 — module cache.
**How to avoid:** Use unique temp directories per test.

### Pitfall 3: photon publint — Order-Sensitive Conditions
**What goes wrong:** `types` not being first causes TypeScript to mis-resolve types under the `import` condition in dual-CJS/ESM packages.
**Why it happens:** The `exports` field in Node.js resolves conditions in declaration order. TypeScript follows this for type resolution.
**How to avoid:** Always declare `types` as the first key in every export entry. `publint` will catch regressions.

### Pitfall 4: Entry Discovery Falls Through to Wrong File
**What goes wrong:** A project with both `src/index.ts` (the app) and `app.ts` (a test helper) could pick the wrong file if the discovery order is not carefully chosen.
**Why it happens:** Naively checking which file exists first.
**How to avoid:** Follow convention — `src/index.ts` is the standard Gravito entry. Only fall back to `src/main.ts`, `app.ts`, `index.ts` if `src/index.ts` does not exist.

### Pitfall 5: Compact Summary Interfering with Machine-Readable Output
**What goes wrong:** If `--format json` is used in CI and the compact summary line is also printed to stdout, JSON parsing of stdout breaks.
**Why it happens:** Summary printed via `console.log` goes to stdout like the payload.
**How to avoid:** Print summary (orbits analyzed count) to stderr, or only print it when format is `dot`. For `json` format, stdout should contain only the JSON payload.

---

## Code Examples

Verified patterns from existing codebase:

### Current depsGraph.ts (full, source of truth for hardening)
```typescript
// Source: packages/cli/src/commands/depsGraph.ts (current)
export async function depsGraph(options: { entry: string; format: 'dot' | 'json' }) {
  try {
    const cwd = process.cwd()
    const entryPath = path.resolve(cwd, options.entry)
    // ... import(entryPath) → core.installedOrbits
  } catch (err) {
    // process.exit(1)
  }
}
```

### Current CLI wiring (index.ts, line ~972)
```typescript
// Source: packages/cli/src/index.ts
cli
  .command('deps:graph', 'Generate Orbit/Satellite dependency graph')
  .option('--entry <file>', 'Entry file (default: src/index.ts)', { default: 'src/index.ts' })
  .option('--format <format>', 'Output format (dot, json)', { default: 'dot' })
  .action((options) => depsGraph(options))
```

### Existing test pattern (mkdtemp migration target)
```typescript
// Source: packages/cli/tests/openapi-generate.test.ts
async function createFixture() {
  const dir = await fs.mkdtemp(path.join(import.meta.dir, 'temp-deps-'))
  return { dir, entry: path.join(dir, 'app.ts') }
}
// cleanup: await fs.rm(fixture.dir, { recursive: true, force: true })
```

### PlanetCore installedOrbits type (verified)
```typescript
// Source: packages/core/src/PlanetCore.ts line 239
public readonly installedOrbits: Array<{ name: string; dependencies: string[] }> = []
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static `madge`-style analysis | Runtime `installedOrbits` from bootstrapped app | Phase 31 design | Graph reflects actual application coupling, not filesystem dependencies |
| No graph command | `gravito deps:graph` (DOT/JSON) | Phase 31 | Developer can visualize module coupling |
| `types` after conditions in photon exports | `types` first in all conditions | Phase 31 fix | TypeScript correctly resolves photon types under all module systems |

---

## Open Questions

1. **`gravito.config.ts` discovery (D-06)**
   - What we know: D-06 says "honor it as the canonical config source when present"; however, `gravito.config.ts` does not currently export a `PlanetCore` instance — it is used for Satellite registration and project-level config.
   - What's unclear: Does D-06 mean "read `gravito.config.ts` to find the entry file path" or "if the project has a config file, auto-discover the entry from standard conventions"? There are no existing examples of `gravito.config.ts` exporting a `core` instance.
   - Recommendation: Treat D-06 conservatively — if `gravito.config.ts` exists in cwd, assume standard layout (`src/index.ts`). Do not attempt to parse it for runtime exports. The `--entry` override covers non-standard layouts.

2. **Photon publint: pre-existing or Phase 31 regression?**
   - What we know: `bun run publint packages/photon` currently outputs ~70 errors, all `types` ordering. `bun run publint packages/cli` and `bun run publint packages/core` are already clean.
   - What's unclear: Whether these photon errors were introduced in Phases 27-30 or pre-existed.
   - Recommendation: Fix them in Phase 31 regardless — D-07 says "validate with publint on the modified public packages before Phase 31 is considered complete," and photon was modified in Phase 28.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `bun` runtime | Test execution | ✓ | 1.3.10 | — |
| `publint` | Export map validation | ✓ | 0.3.18 | — |
| `@gravito/core` | `installedOrbits` | ✓ | workspace:* | — |
| `node:fs` / `node:path` | Entry discovery | ✓ | built-in | — |

**Missing dependencies with no fallback:** None.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bun:test (built-in) |
| Config file | none — bun test discovers `**/*.test.ts` |
| Quick run command | `bun test packages/cli/tests/deps-graph.test.ts --timeout=15000` |
| Full suite command | `bun test packages/cli/tests/ --timeout=15000` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TOOL-01 | JSON output from `installedOrbits` | unit | `bun test packages/cli/tests/deps-graph.test.ts --timeout=15000` | ✅ (1 test) |
| TOOL-01 | DOT output format correctness | unit | `bun test packages/cli/tests/deps-graph.test.ts --timeout=15000` | ❌ Wave 0 gap |
| TOOL-01 | Error when no PlanetCore found | unit | `bun test packages/cli/tests/deps-graph.test.ts --timeout=15000` | ❌ Wave 0 gap |
| TOOL-01 | Project-root entry discovery | unit | `bun test packages/cli/tests/deps-graph.test.ts --timeout=15000` | ❌ Wave 0 gap |
| D-07/D-08 | No publint errors in photon/cli/core | smoke | `bun run publint packages/photon && bun run publint packages/cli && bun run publint packages/core` | ❌ photon currently fails |

### Sampling Rate
- **Per task commit:** `bun test packages/cli/tests/deps-graph.test.ts --timeout=15000`
- **Per wave merge:** `bun test packages/cli/tests/ --timeout=15000`
- **Phase gate:** Full suite green + `publint` clean on photon/cli/core before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `packages/cli/tests/deps-graph.test.ts` — add DOT format test, error-path test, entry-discovery test (migrate to `mkdtemp` pattern)
- [ ] `bun run publint packages/photon` — fix `types`-ordering in exports map before any new tests can mark D-07 green

*(Existing test infrastructure covers the JSON format case. Wave 0 must extend coverage for the three missing behaviors.)*

---

## Sources

### Primary (HIGH confidence)
- Direct source code inspection: `packages/cli/src/commands/depsGraph.ts` — full implementation
- Direct source code inspection: `packages/cli/src/index.ts` lines 968-975 — CAC wiring
- Direct source code inspection: `packages/core/src/PlanetCore.ts` line 239 — `installedOrbits` type
- Direct source code inspection: `packages/cli/tests/deps-graph.test.ts` — existing test coverage
- `bun run publint packages/photon` live output — 70 errors, all `types` ordering
- `bun run publint packages/cli` live output — clean
- `bun run publint packages/core` live output — clean
- `bun test packages/cli/tests/deps-graph.test.ts` live output — 1 pass

### Secondary (MEDIUM confidence)
- `packages/cli/tests/openapi-generate.test.ts` — `mkdtemp` fixture pattern to adopt

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified as already installed and working
- Architecture: HIGH — implementation exists; gaps identified by direct inspection and test execution
- Pitfalls: HIGH — Pitfall 1-2 verified by comparing test patterns; Pitfall 3 verified by live `publint` output; Pitfalls 4-5 are design-time reasoning (MEDIUM)

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable domain; no fast-moving dependencies)
