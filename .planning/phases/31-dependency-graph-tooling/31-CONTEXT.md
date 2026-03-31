# Phase 31: Dependency Graph Tooling - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Developer can generate an application-level Orbit/Satellite dependency graph via `gravito deps:graph`, with output that reveals module coupling relationships from the actual bootstrapped Gravito application.

This phase hardens the existing CLI command and export surface. It does not introduce a separate package-graph scanner or a new dependency visualization subsystem.

</domain>

<decisions>
## Decisions

### Source of Truth
- **D-01:** `PlanetCore.installedOrbits` is the canonical runtime graph source because it already records each registered orbit/plugin name plus its `dependencies` array.
- **D-02:** Dependency edges are taken from bootstrapped Orbit/Satellite registration state, not from `package.json` dependency metadata. The goal is application coupling, not npm package coupling.

### CLI Behavior
- **D-03:** `gravito deps:graph` remains the user-facing command name.
- **D-04:** `dot` is the default output format because it is immediately useful for visual graph rendering, while `json` stays available for tooling and CI.
- **D-05:** The command should prefer project-root discovery when possible, but keep an `--entry` override for explicit control and legacy app layouts.
- **D-06:** Existing runtime bootstrap entrypoints are the target for discovery; if a project has `gravito.config.ts`, it should be honored as the canonical config source when present.

### Verification Strategy
- **D-07:** Export hygiene must be validated with `publint` on the modified public packages before Phase 31 is considered complete.
- **D-08:** Phase 31 should treat any `ERR_PACKAGE_PATH_NOT_EXPORTED` regression as a release blocker, since the milestone explicitly closes out public symbol stability from Phases 27-30.

### Implementation Shape
- **D-09:** The current `packages/cli/src/commands/depsGraph.ts` implementation is the starting point. Phase 31 should harden and finish it rather than replace it with a new architecture.
- **D-10:** The existing `packages/cli/src/commands/index.ts` export and `packages/cli/src/index.ts` registration are the integration points that must remain in sync.

</decisions>

<discretion>
## Discretion Areas

- Exact DOT styling for nodes, edges, labels, and any grouping/clustering
- Whether JSON output should be a raw `installedOrbits` dump or a normalized graph schema
- Whether to emit SVG as a derived format now or defer it
- Whether the command should print a compact summary alongside the graph payload

</discretion>

<deferred>
## Deferred Ideas

- Static package-level dependency graphing from `package.json`/workspace metadata is out of scope for this phase
- SVG export can be added later if there is demand for a polished visual artifact
- Broader `madge`-backed analysis is optional; the current phase can stay on runtime Orbit/Satellite metadata

</deferred>

<canonical_refs>
## Canonical References

- `.planning/ROADMAP.md` - Phase 31 goal, success criteria, and dependency on Phase 30
- `.planning/REQUIREMENTS.md` - `TOOL-01` requirement
- `.planning/research/SUMMARY.md` - dependency graph recommendation and `madge` note
- `packages/core/src/PlanetCore.ts` - `installedOrbits` tracking and `GravitoOrbit.dependencies`
- `packages/core/src/index.ts` - public core exports used by CLI consumers
- `packages/cli/src/commands/depsGraph.ts` - current dependency graph command implementation
- `packages/cli/src/commands/index.ts` - command barrel export
- `packages/cli/src/index.ts` - CLI registration for `deps:graph`
- `packages/cli/tests/deps-graph.test.ts` - existing command regression coverage
- `packages/cli/package.json` - CLI package export map and bin surface

</canonical_refs>

<code_context>
## Existing Code Insights

- `PlanetCore.installedOrbits` already stores `{ name, dependencies }` records when an orbit or plugin is installed, so the runtime graph does not need a second discovery mechanism.
- `packages/cli/src/commands/depsGraph.ts` already supports `json` and `dot` output, imports the target entry module, and reads `core.installedOrbits`.
- `packages/cli/src/index.ts` already wires `deps:graph` into the CLI, so Phase 31 is primarily about finishing the command contract and validating exports.
- `packages/cli/package.json` already exposes the CLI package via `bin` and `exports`, so the remaining work is about confirming those boundaries stay valid after any final edits.
- `madge` is not present in the root `package.json`, so a separate package-graph dependency is not currently part of the verified toolchain.

</code_context>

<specifics>
## Specific Ideas

- Keep the command usable from the project root with a sensible default entry path, while still allowing explicit override for nonstandard applications.
- Treat the runtime Orbit/Satellite graph as the primary product; package metadata analysis is a separate concern.
- Preserve the current no-surprise behavior: the command should fail clearly if it cannot find a usable `PlanetCore` export.

</specifics>

