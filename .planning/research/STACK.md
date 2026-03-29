# Stack Research

**Domain:** TypeScript/Bun monorepo framework — DX improvements for @gravito/core v2.1.0
**Researched:** 2026-03-29
**Confidence:** HIGH (tool versions verified against npm registry; Biome rule existence verified via web search)

## Current State Audit

What already exists in the toolchain relevant to DX:

| Capability | Tool | Status |
|------------|------|--------|
| Linting + formatting | Biome 2.3.10 (root) | Exists — configured but `noConsole` not enabled |
| Type checking | TypeScript 5.9.3 strict | Exists — `noUnusedLocals`, `noUnusedParameters` ON |
| Test runner | Bun native test | Exists |
| API documentation | TypeDoc 0.27 (`@gravito/atlas`), TypeDoc 0.25 (`@gravito/quasar`) | Partial — inconsistent versions, `@gravito/core` has no TypeDoc config |
| Pre-commit hooks | `simple-git-hooks` + `lint-staged` | Exists — runs Biome on staged files |
| Star exports (`export * from`) | Throughout `exceptions/index.ts`, `helpers.ts`, `testing/index.ts` | Problem — leaks internal names into public API surface |
| console.log in source | `Router.ts:610` unconditional debug log | Bug — needs removal; no lint rule enforcing it |
| `any` in public API | `HttpTester.ts`, `types.ts`, `hooks/types.ts`, `PlanetCore.ts` | Problem — ~15 occurrences in src; `noExplicitAny` is `warn` not `error` in Biome |
| boot() config passthrough | `PlanetCore.boot()` drops `observabilityProvider` | Bug — four fields passed, `observabilityProvider` silently dropped |
| Package validation | None | Missing — no publint, no attw |
| Unused export detection | None | Missing |

**Key insight:** Most DX improvements are code fixes, not new tooling. The tooling gaps that matter are (1) elevating `noExplicitAny` to `error` in Biome, (2) enabling `noConsole`, and (3) adding `publint` for package export validation. Everything else is editing source files.

---

## Recommended Stack Changes

### 1. Biome Configuration Upgrades (Zero New Dependencies)

**Change `noExplicitAny` from `warn` to `error` in `biome.json`.**

Current config:
```json
"suspicious": {
  "noExplicitAny": "warn"
}
```

Change to:
```json
"suspicious": {
  "noExplicitAny": "error",
  "noConsole": {
    "level": "warn",
    "options": {
      "allow": ["error", "warn", "info"]
    }
  }
}
```

Why: `noExplicitAny: warn` means the CI gate doesn't catch regressions — a `warn` in Biome exits 0. Elevating to `error` makes any new `any` in public API a build failure. The `noConsole` rule (available since Biome 2.x, confirmed stable in 2.4) with `allow: ["error", "warn", "info"]` catches debug `console.log` leaks like `Router.ts:610` while permitting intentional structured logging.

**Note on scope:** Apply the `noConsole` rule only to `packages/core/src/` overrides, not globally. CLI tools and scripts legitimately use `console.log` — the global ban would break `cli/queue-commands.ts` by design.

Biome override pattern:
```json
"overrides": [
  {
    "include": ["packages/core/src/**", "!packages/core/src/cli/**"],
    "linter": {
      "rules": {
        "suspicious": {
          "noConsole": {
            "level": "error",
            "options": { "allow": ["error", "warn", "info"] }
          }
        }
      }
    }
  }
]
```

### 2. publint — Package Export Validation (New, Root Dev Dep)

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `publint` | ^0.3.18 | Validates `package.json` `exports`, `main`, `module`, `types` field correctness before publish | Catches the most common class of monorepo publish bugs: consumers getting `Cannot find module` or wrong types despite the package building cleanly. Zero dependencies. Node >=18. |

The project has 50+ packages with `exports` maps (conditional `bun`/`browser`/`types`/`default` branches). A mis-wired `types` condition silently breaks TypeScript inference for downstream consumers. `publint` catches this at CI time, not after npm publish.

**Installation:**
```bash
# at root for CI-wide use:
bun add -D publint
```

**Usage in CI / package scripts:**
```bash
# per-package (add to package.json scripts)
"publint": "publint ."

# root-level (after build)
bunx publint packages/core
bunx publint packages/photon
```

### 3. TypeDoc Upgrade + Core Config (Existing Tool, Version Alignment)

TypeDoc is already installed in two packages (`quasar@0.25`, `atlas@0.27`). `@gravito/core` has no TypeDoc config despite having 100% JSDoc coverage from v1.4.0.

**Action:** Add TypeDoc 0.28 to `@gravito/core` dev deps and create `typedoc.json`. Do NOT add TypeDoc globally — it is a per-package docs tool.

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `typedoc` | ^0.28.18 | Generates browsable API reference from JSDoc | Core has 100% JSDoc coverage (achieved v1.4.0) with no output target. TypeDoc 0.28 adds TypeScript 5.9 compatibility and improved monorepo `--entryPointStrategy merge` support. |

**`typedoc.json` for `@gravito/core`:**
```json
{
  "$schema": "https://typedoc.org/schema.json",
  "entryPoints": ["src/index.ts"],
  "out": "docs/api",
  "hideGenerator": true,
  "readme": "README.md",
  "excludeInternal": true,
  "excludePrivate": true,
  "plugin": []
}
```

`excludeInternal: true` is critical — it prevents `@internal`-tagged exports from appearing in the generated docs, which directly addresses the module organization requirement of handling `@internal` exports.

**Upgrade `quasar` from 0.25 → 0.28** to eliminate the version split. TypeDoc 0.28 is backward-compatible with 0.25 configs.

### 4. No New Tools Needed for These DX Goals

| Goal | Why No New Tool |
|------|-----------------|
| Eliminate `any` in public API | Biome `noExplicitAny: error` + manual fix of ~15 occurrences. Tools like `type-coverage` are redundant when strict mode + Biome `error` already enforces zero `any`. |
| Star export → named export | Code change only. The specific files are known (`exceptions/index.ts`, `helpers.ts`, `testing/index.ts`). |
| boot() observabilityProvider fix | Pure code fix: add `observabilityProvider` to the spread in `PlanetCore.boot()`. One line change. No tooling. |
| Router console.log removal | One-line fix in `Router.ts:610`. Enforce via `noConsole` Biome rule going forward. |
| AuthException/AuthenticationException unification | Code change: deprecate `AuthException` with `@deprecated`, update `exceptions/index.ts`. No tooling needed. |
| README/JSDoc sync | Manual editorial work. TypeDoc with `excludeInternal: true` auto-enforces the boundary going forward. |
| GravitoVariables type improvements | TypeScript code changes. No tooling. |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@microsoft/api-extractor` | Designed for DTS rollup and DefinitelyTyped pipelines. Requires `api-extractor.json` per package, API review file management, a separate review CI step. The overhead (7.57 MB, per-package config, review workflow) exceeds the benefit for v2.1.0 DX fixes. | TypeDoc for docs, publint for export validation |
| `type-coverage` | Redundant when `noExplicitAny: error` in Biome and TypeScript strict mode are enforced. Reports a % but doesn't gate CI more effectively than Biome's rule-level `error`. | `noExplicitAny: error` in Biome |
| `knip` (for v2.1.0) | Knip v6.1 requires Node `^20.19.0 || >=22.12.0` — compatible — but running knip across 50 packages in a Turbo monorepo produces a large noisy report that requires significant triage time disproportionate to v2.1.0's scope. The specific `export *` patterns to fix are already known. | Manual named export conversion of known star exports; defer knip to a dedicated cleanup milestone |
| `ts-unused-exports` | Superseded by knip. Older single-purpose tool. | knip (when ready for cleanup milestone) |
| `barrelsby` | Auto-generates barrel files (index.ts re-exports). The v2.1.0 goal is reducing star exports, not generating more barrels. Barrelsby would work against that goal. | Manual named export conversion |
| `@arethetypeswrong/cli` | Requires Node >=20 — compatible — but attw is most valuable for validating CJS/ESM interop issues in published packages. Gravito is ESM-only (`"type": "module"`) with Bun as primary runtime; the class of issues attw detects (FalseExportDefault, CJSOnlyExportsDefault) are largely irrelevant. `publint` covers the package.json validation surface that matters. | `publint` |
| `eslint` + `@typescript-eslint` | Biome 2.3 is already installed and covers 95%+ of the lint rules relevant here. Adding ESLint creates toolchain duplication and config maintenance overhead. | Biome with upgraded rules |
| `typedoc-plugin-markdown` (for core) | Only useful if generating docs to embed in MDX or Obsidian. The Obsidian vault work is explicitly out of scope for v2.1.0. | Plain TypeDoc HTML output |

---

## Installation Summary

Only two actual package changes needed for v2.1.0:

```bash
# 1. publint — at root level (covers all packages in CI)
bun add -D publint

# 2. TypeDoc for @gravito/core (already in atlas/quasar, just add to core)
bun add -D typedoc --filter @gravito/core

# 3. Upgrade quasar from 0.25 to 0.28 (version alignment, not strictly required for v2.1.0)
bun add -D typedoc@^0.28.18 --filter @gravito/quasar
```

Zero new runtime dependencies. All three are devDependencies.

---

## Integration with Existing Toolchain

### Biome Integration

Biome 2.3.10 is already running via `lint-staged` pre-commit. The `noConsole` and `noExplicitAny: error` changes take effect immediately on next `bun run check`. No version upgrade needed — both rules exist in the installed version.

The `noConsole` rule uses the `allow` option to whitelist `console.error`, `console.warn`, and `console.info` — this matches the existing logging patterns in `@gravito/core` which uses a logger abstraction for most output.

### Turbo Integration

Add `publint` to the Turbo pipeline after `build`:

```json
// turbo.json addition
"publint": {
  "dependsOn": ["build"],
  "inputs": ["dist/**", "package.json"],
  "outputs": []
}
```

### TypeDoc Integration

TypeDoc runs outside the Turbo build pipeline (documentation is not a build artifact). Add as a standalone `docs` script:

```json
// packages/core/package.json
"docs": "typedoc"
```

### TypeScript Compatibility

TypeDoc 0.28.18 requires Node >=18 and TypeScript >=4.6. The project runs TypeScript 5.9.3, Node v22.17 — fully compatible. TypeDoc reads from `tsconfig.json` automatically; the `typedoc.json` only overrides TypeDoc-specific settings.

The `excludeInternal: true` TypeDoc option reads `@internal` JSDoc tags — these should be added to any export in `@gravito/core` that is exported for cross-package use but not intended for external consumers.

---

## Confidence Assessment

| Finding | Confidence | Source |
|---------|------------|--------|
| Biome `noConsole` rule exists and is stable in 2.x | HIGH | Biome docs + web search confirming 2.4 metrics |
| `noExplicitAny` currently `warn` in `biome.json` | HIGH | Direct codebase read |
| publint 0.3.18, Node >=18, zero deps | HIGH | npm registry direct query |
| TypeDoc 0.28.18 latest, Node >=18, TS 5.9 compatible | HIGH | npm registry + changelog |
| api-extractor over-engineered for this scope | MEDIUM | Architectural judgment based on api-extractor docs + Gravito's existing setup |
| knip Node >=20.19 requirement | HIGH | npm registry direct query |
| Router.ts:610 is the specific console.log location | HIGH | Direct codebase read |
| boot() observabilityProvider drop in PlanetCore.ts:789-794 | HIGH | Direct codebase read |
| AuthException + AuthenticationException both star-exported | HIGH | Direct codebase read of exceptions/index.ts |
| ~15 `any` occurrences in core/src | HIGH | Direct grep result |

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Biome `noExplicitAny: error` | `type-coverage` CLI | Type-coverage reports a %, doesn't gate CI on new `any` introductions as precisely as Biome's rule-level `error` |
| TypeDoc 0.28 (per-package) | `@microsoft/api-extractor` | api-extractor targets DefinitelyTyped publishing workflows with API review gates. Gravito needs browsable HTML docs from existing JSDoc. TypeDoc is the right fit. |
| `publint` (lightweight, zero deps) | `@arethetypeswrong/cli` | attw targets CJS/ESM interop problems. Gravito is ESM-only; publint's `exports` field validation is the relevant check. |
| Manual star→named export conversion | `knip` auto-fix | Knip across 50 packages needs full triage; the 3 target files are already known for v2.1.0. |

---

## Sources

- npm registry — `publint@0.3.18`: Node >=18, zero deps (verified 2026-03-29)
- npm registry — `typedoc@0.28.18`: Node >=18, latest version (verified 2026-03-29)
- npm registry — `knip@6.1.0`: Node `^20.19.0 || >=22.12.0` (verified 2026-03-29)
- npm registry — `@microsoft/api-extractor@7.57.7`: no engine constraints, no peer deps (verified 2026-03-29)
- npm registry — `type-coverage@2.29.7`: no engine constraints (verified 2026-03-29)
- npm registry — `@arethetypeswrong/cli@0.18.2`: Node >=20 (verified 2026-03-29)
- [Biome noConsole rule](https://biomejs.dev/linter/rules/no-console/): stable, allow list supported (HIGH confidence — official docs)
- [What's New in Biome v2.4](https://medium.com/@onix_react/whats-new-in-biome-v2-4-00890baad13b): `noConsole` confirmed in suspicious group (MEDIUM confidence)
- [Knip unused exports](https://knip.dev/typescript/unused-exports): Bun compatible (MEDIUM confidence — official docs)
- [publint rules](https://publint.dev/rules): exports field validation scope confirmed (HIGH confidence — official docs)
- Codebase audit — `packages/core/src/PlanetCore.ts:788-794`: `observabilityProvider` drop confirmed (HIGH)
- Codebase audit — `packages/core/src/Router.ts:610`: `console.log` confirmed (HIGH)
- Codebase audit — `biome.json`: `noExplicitAny: "warn"` confirmed, `noConsole` absent (HIGH)
- Codebase audit — `packages/core/src/exceptions/index.ts`: `AuthException` + `AuthenticationException` both star-exported (HIGH)

---
*Stack research for: Gravito v2.1.0 Core DX improvements*
*Researched: 2026-03-29*
