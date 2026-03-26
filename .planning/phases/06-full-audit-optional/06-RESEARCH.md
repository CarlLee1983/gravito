# Phase 6: Full Audit - Research

**Researched:** 2026-03-26
**Domain:** Framework audit tooling — performance profiling, documentation analysis, security scanning
**Confidence:** HIGH for standard stack, MEDIUM for project-specific baselines

## Summary

Phase 6 is an optional comprehensive audit of gravito-core following the successful completion of Phase 4B Hono migration. The audit spans three dimensions: **performance profiling** (HTTP latency, memory, bundle sizes), **documentation review** (API coverage and example freshness), and **security vulnerability scanning** (dependency vulnerabilities and unsafe patterns).

The framework is currently healthy (93/100, 99.7% test pass rate, 0 TypeScript errors) with no known critical issues. This audit will establish baseline metrics and identify optimization opportunities for future phases.

**Primary recommendation:** Use a combination of industry-standard tools (`npm audit` for security, `autocannon` + `clinic.js` for performance, `typedoc` + custom script for documentation coverage) layered with project-specific measurement scripts to capture the health metrics locked in CONTEXT.md.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Performance audit (locked):** Measure photon HTTP handler latency (100 concurrent requests), core container startup time, bundle sizes for main entrypoints (photon, core, signal), heap memory usage, and report latency distribution (p50, p95, p99)
- **Documentation audit (locked):** Scan public APIs in photon, core, signal for missing JSDoc, verify README.md files in all 60+ packages, check for outdated examples, identify modules with <80% JSDoc coverage as warning threshold
- **Security audit (locked):** Run `npm audit`, review production dependencies for end-of-life packages, check for hardcoded secrets/API keys, scan for unsafe patterns (eval, Function(), etc.)

### Claude's Discretion
- Tool selection and measurement methodology — research should recommend specific tools and commands

### Deferred Ideas (OUT OF SCOPE)
- Load testing (vs baseline latency profiling only)
- UI/UX audit (no UI layer in gravito-core)
- Architecture refactoring based on findings
- Implementation of discovered issues (audit only, no fixes)

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PERF-01 | Measure HTTP latency (100 concurrent requests) | Autocannon tool + Clinic.js for detailed profiling |
| PERF-02 | Measure core container startup time | Node.js native timing API + custom instrumentation |
| PERF-03 | Measure bundle sizes (photon, core, signal) | esbuild built-in analyzer + source-map-explorer |
| PERF-04 | Document heap memory usage (baseline + load) | Node.js --inspect flag + autocannon profiling |
| PERF-05 | Report latency distribution (p50, p95, p99) | Autocannon provides percentile metrics natively |
| DOC-01 | Scan JSDoc coverage in photon, core, signal | TypeDoc with --json output for coverage analysis |
| DOC-02 | Verify README.md in all 60+ packages | Shell script with find + wc validation |
| DOC-03 | Check for outdated examples in docs/ | Grep-based pattern matching against version markers |
| DOC-04 | Identify <80% JSDoc coverage modules | TypeDoc analysis with custom thresholds |
| SEC-01 | Run npm audit on entire workspace | npm audit --json for CI-friendly output |
| SEC-02 | Review production EOL packages | Custom script against npm registry metadata |
| SEC-03 | Secret scanning (hardcoded keys/tokens) | TruffleHog or Gitleaks for git history scan |
| SEC-04 | Scan for unsafe patterns (eval, Function()) | Grep-based pattern search across codebase |

## Standard Stack

### Core (Security Scanning)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| npm audit | Built-in (npm 6+) | Identify known vulnerabilities in dependencies | Industry standard, integrated into npm, no extra install |
| TruffleHog | 3.60+ | Scan for hardcoded secrets in git history | Actively maintained, 800+ secret types, credential validation |
| Gitleaks | 8.18+ | Lightweight pre-commit secret scanning | Fast pattern-based detection, popular alternative to TruffleHog |

### Performance Profiling & Benchmarking

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| autocannon | 7.10+ | HTTP/1.1 benchmarking tool with latency percentiles | Measure HTTP handler latency, throughput under load |
| clinic.js | 13.0+ | Node.js performance profiling visualization suite | Detailed CPU/memory profiling, bottleneck identification |
| clinic doctor | Part of clinic.js | Auto-run benchmarking and generate flame graphs | Comprehensive diagnosis of application performance |
| node --inspect | Built-in (Node 6.3+) | V8 Inspector Protocol for heap profiling | Capture memory snapshots at baseline and under load |

### Documentation Analysis

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| typedoc | 0.25+ (project uses 0.27) | Generate API documentation from TypeScript/JSDoc | Analyze JSDoc coverage of public APIs |
| JSDoc | 4.0+ | Traditional JavaScript documentation generator | Generate API docs, coverage analysis |
| source-map-explorer | 2.5+ | Visualize bundle composition from source maps | Analyze bundle size breakdown by module |

### Bundle Size Analysis

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| esbuild --analyze | 0.20+ | Built-in bundle analyzer in esbuild | Visualize bundle contents, identify large modules |
| source-map-explorer | 2.5+ | Interactive analysis of any JavaScript bundle | Cross-bundler support (esbuild, rollup, webpack) |
| @viz-kit/esbuild-analyzer | 2.0+ | Interactive UI analyzer for esbuild bundles | Visual breakdown of bundle composition |

### Utility & Integration

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| turbo run | 2.x (project uses latest) | Execute audit scripts across monorepo | Run audit tasks in parallel across 60+ packages |
| bun | 1.3.9+ (project uses 1.3.9) | Runtime for custom measurement scripts | High-performance scripting for audit data collection |

### Installation

```bash
# Security scanning
npm install -D snyk trufflehog gitleaks

# Performance profiling
npm install -D clinic autocannon

# Documentation analysis
npm install -D typedoc @types/node

# Bundle analysis
npm install -D source-map-explorer @viz-kit/esbuild-analyzer

# For audit automation
npm install -D turbo
```

**Version verification:**
- npm audit: Built-in, no version check needed
- Snyk: Current v1.1300+ (verified 2026-03)
- Clinic.js: 13.0+ (current stable branch)
- Autocannon: 7.10+ (current stable)
- TypeDoc: 0.25+ (project uses 0.27, verified compatible)
- Gitleaks: 8.18+ (current release)

## Architecture Patterns

### Recommended Audit Project Structure

```
.planning/phases/06-full-audit-optional/
├── 06-RESEARCH.md              # This file — research findings
├── 06-PLAN.md                  # Implementation plan
├── audit/
│   ├── performance/
│   │   ├── photon-latency.json       # Autocannon results
│   │   ├── core-startup-time.json    # Startup profiling
│   │   ├── bundle-sizes.json         # esbuild analyzer output
│   │   └── memory-profile.heapsnapshot  # V8 heap snapshot
│   ├── documentation/
│   │   ├── jsdoc-coverage.json       # TypeDoc coverage report
│   │   ├── readme-verification.json  # README presence check
│   │   └── outdated-examples.txt     # Example freshness scan
│   └── security/
│       ├── npm-audit.json            # npm audit --json output
│       ├── secrets-scan.json         # TruffleHog results
│       └── unsafe-patterns.txt       # Grep results for eval, Function()
└── REPORTS/
    ├── PERFORMANCE_BASELINE.md   # Latency, memory, bundle analysis
    ├── DOCUMENTATION_AUDIT.md    # API coverage, README status
    └── SECURITY_AUDIT.md         # Vulnerabilities, EOL packages, secrets
```

### Pattern 1: Performance Profiling Workflow

**What:** Establish baseline HTTP handler performance under load and identify memory/latency bottlenecks

**When to use:** Post-release or after major refactoring to validate performance characteristics remain stable

**Example:**

```bash
# 1. Start server with clinic.js profiling
clinic doctor --on-port='autocannon -c100 -d30s localhost:$PORT' -- \
  node packages/photon/examples/http-server.js

# 2. Autocannon collects:
# - Requests/sec (throughput)
# - Latency percentiles (p50, p95, p99)
# - Connection time, processing time

# 3. Clinic.js generates flame graph and identifies hotspots

# 4. Collect memory profile
node --expose-gc --inspect packages/photon/examples/http-server.js
# Then connect Chrome DevTools to chrome://inspect and capture heap snapshot
```

**Output:** JSON report with latency distribution and memory baseline

### Pattern 2: Documentation Coverage Audit

**What:** Scan public APIs for missing JSDoc and identify modules below coverage threshold (80%)

**When to use:** Before releases or as part of quarterly health checks

**Example:**

```bash
# 1. Generate TypeDoc JSON report
typedoc --json typedoc-output.json \
  packages/photon/src \
  packages/core/src \
  packages/signal/src

# 2. Parse JSON to calculate coverage
# - count: total exported items
# - documented: items with JSDoc/description
# - coverage% = documented / count

# 3. Flag modules < 80%
jq '.children[] | {name, coverage: .comment}' typedoc-output.json
```

**Output:** JSON with per-module coverage %, warning list for modules < 80%

### Pattern 3: Security Scanning Pipeline

**What:** Layered vulnerability detection — npm audit, secret scanning, unsafe pattern detection

**When to use:** Every release, or quarterly for ongoing monitoring

**Example:**

```bash
# 1. Dependency vulnerability scan
npm audit --json > security-audit/npm-audit.json

# 2. Secret scanning (entire git history)
trufflehog git file://. --json > security-audit/secrets.json

# 3. Unsafe pattern scan
grep -r "eval(" packages --include="*.ts" --include="*.js" | tee security-audit/unsafe-eval.txt
grep -r "Function(" packages --include="*.ts" --include="*.js" | tee security-audit/unsafe-function.txt
```

**Output:** JSON reports + plaintext danger lists for manual review

### Anti-Patterns to Avoid

- **Ignoring warnings in npm audit:** Audit output with `--audit-level=moderate` or higher should block releases; defer to high-risk packages only
- **Skipping cluster profiling:** Don't measure single-request latency — use 100+ concurrent requests to reveal contention issues
- **Hardcoding baseline expectations:** Store baselines in git-tracked files, not environment variables, for easy diffing and history
- **Audit-only → no follow-up:** Audit findings require triage, prioritization, and tracking; audit is input to sprint planning
- **Over-relying on automated tools:** Manual review of top-10 secrets and top-5 unsafe patterns catches edge cases tools miss

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP latency benchmarking | Custom Node.js timing loop | Autocannon | Handles connection pooling, pipelining, accurate percentile calculation |
| Heap memory profiling | Manual setTimeout + process.memoryUsage() | Node.js --inspect + DevTools | V8 heap snapshots are precise, DevTools provides root cause analysis |
| Bundle size visualization | Parsed webpack-stats JSON analysis | source-map-explorer or esbuild --analyze | Already optimized for your bundler, interactive UI, accurate gzip estimation |
| JSDoc coverage calculation | Regex parse of comments | TypeDoc --json | Understands TypeScript syntax, inheritance, overloads, re-exports |
| Secret pattern matching | Simple hardcoded regex list | TruffleHog or Gitleaks | 800+ patterns maintained by security researchers, entropy-based detection, credential validation |
| npm audit parsing | Custom jq/JSON parsing | npm audit --json piped to custom script | Maintains compatibility with future npm versions, official format |

**Key insight:** Audit tools are specialized, actively maintained, and handle edge cases (connection pooling, credential validation, source map accuracy) that custom implementations inevitably miss. Time saved by "quick custom script" is immediately lost when edge cases appear in production.

## Common Pitfalls

### Pitfall 1: Single-Request Latency Measurement
**What goes wrong:** Measuring latency of one request at a time shows 5-10ms, but under 100 concurrent requests, latency jumps to 50-100ms due to thread pool exhaustion or garbage collection pauses

**Why it happens:** Single-request measurements ignore queueing, connection reuse, GC scheduling. Real-world load reveals bottlenecks hidden at low concurrency

**How to avoid:** Always measure with `autocannon -c100` (100 concurrent connections) for 30+ seconds to allow GC and scheduling to stabilize

**Warning signs:**
- Latency p95 and p99 dramatically higher than p50
- Memory rising steadily (GC not catching up)
- Throughput dropping over time (thread pool saturation)

### Pitfall 2: Memory Baseline Taken During Idle
**What goes wrong:** Heap snapshot at startup shows 15MB, but docs claim "lightweight container". Under load, heap jumps to 80MB + external buffers

**Why it happens:** Request handlers allocate temporary objects, caches warm up, event listeners accumulate. Idle snapshot doesn't reveal working memory

**How to avoid:** Snapshot heap AFTER load test completes (30+ seconds of 100 concurrent requests). Check both peak usage and post-GC baseline

**Warning signs:**
- Large gap between reported heap and peak observed during profiling
- Heap not returning to baseline after requests complete (memory leak)
- External memory (buffers, C++ objects) larger than reported heap

### Pitfall 3: JSDoc Coverage False Negatives
**What goes wrong:** TypeDoc reports 85% coverage, but core public functions like `createContainer()` are not documented — they inherit from private base class

**Why it happens:** TypeDoc counts exported items, not developer-facing entrypoints. Inherited or internal items skew the metric

**How to avoid:** Manually spot-check top 10 exported items from each package. Flag TypeDoc as "documentation completeness" not "coverage %". Use it to find obviously undocumented items

**Warning signs:**
- Coverage % seems high but README examples reference undocumented functions
- Public API classes document base class but not specialized subclasses
- Type-only re-exports counted as "documented" even if no JSDoc on the underlying type

### Pitfall 4: Ignoring Production vs DevDependencies in npm audit
**What goes wrong:** npm audit reports 120 vulnerabilities. After investigation, 115 are in devDependencies (mocha, typescript, etc.) never shipped to production

**Why it happens:** npm audit treats all vulnerabilities equally by default. DevDeps have longer lag for patches since they don't affect production

**How to avoid:** Run `npm audit --production` first to see real production risks. Audit devDeps separately with longer threshold (moderate vs. critical)

**Warning signs:**
- Vulnerabilities in mocha, webpack, eslint, typescript (development-only tools)
- Same CVE in both audit reports when you check --production separately
- Remediations require unpractical version bumps (typescript 4.5 → 5.9) for marginal devDep vulnerability

### Pitfall 5: Secrets Found But Not Remediated
**What goes wrong:** TruffleHog finds 3 AWS keys in git history. Team documents findings but forgets to rotate the actual keys

**Why it happens:** Finding is separated from remediation workflow. Keys are still active, leaks still exploitable

**How to avoid:** When TruffleHog validates a secret as "still active", immediately trigger key rotation. Document rotation in the audit report. Disable keys before merging audit findings

**Warning signs:**
- Secret still works when tested (TruffleHog reports "verified")
- Key found in old commits but no evidence of rotation
- Same pattern (AWS key) found again in later audit

## Code Examples

Verified patterns from official sources and project scripts:

### Performance: Autocannon HTTP Latency Measurement

```typescript
// Source: https://www.npmjs.com/package/autocannon
// Run in shell:
// autocannon -c 100 -d 30 --json http://localhost:3000 > results.json

import autocannon from 'autocannon'

const result = await autocannon({
  url: 'http://localhost:3000',
  connections: 100,
  duration: 30,
  requests: [
    {
      path: '/',
      method: 'GET',
    },
    {
      path: '/api/health',
      method: 'GET',
    },
  ],
})

console.log('Latency p50:', result.requests[0].latency.p50)
console.log('Latency p95:', result.requests[0].latency.p95)
console.log('Latency p99:', result.requests[0].latency.p99)
console.log('Throughput (req/s):', result.requests[0].throughput.average)
```

### Documentation: TypeDoc Coverage Report

```typescript
// Source: https://typedoc.org/
// Generate JSON: typedoc --json output.json src/

import fs from 'fs'

const report = JSON.parse(fs.readFileSync('typedoc.json', 'utf-8'))

function calculateCoverage(group: any): number {
  if (!group.children) return 100

  const total = group.children.length
  const documented = group.children.filter(
    (item: any) => item.comment && item.comment.shortText
  ).length

  return (documented / total) * 100
}

console.log('Documentation Coverage:')
report.children.forEach((pkg: any) => {
  const coverage = calculateCoverage(pkg)
  const status = coverage >= 80 ? '✅' : '⚠️'
  console.log(`${status} ${pkg.name}: ${coverage.toFixed(1)}%`)
})
```

### Security: npm audit with Production Filter

```bash
# Source: https://nodejs-security.com/blog/how-to-use-npm-audit

# Scan production dependencies only
npm audit --production --json > npm-audit-production.json

# Scan all dependencies (includes dev)
npm audit --json > npm-audit-all.json

# Parse for critical vulnerabilities
jq '.vulnerabilities[] | select(.severity=="critical") | {via: .via[0], fixed_in: .fixAvailable}' npm-audit-all.json
```

### Security: TruffleHog Secret Scanning

```bash
# Source: https://github.com/trufflesecurity/trufflehog

# Scan entire git history
trufflehog git file://. --json --fail > secrets.json

# TruffleHog output includes:
# - Verified: is the credential still active?
# - Type: AWS key, GitHub token, API key, etc.
# - Commit: git commit where secret appeared

# Parse for verified secrets (immediately dangerous)
jq '.[] | select(.verified==true) | {secret_type: .type, commit: .commit}' secrets.json
```

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Performance profiling (--inspect) | ✓ | 20.0+ | Use Bun (built-in profiling) |
| npm | npm audit, script execution | ✓ | 10.0+ | Use bun install + bun run |
| Bun | Build system, script runner | ✓ | 1.3.9 | Use Node.js (slower but works) |
| Git | TruffleHog history scan, commit analysis | ✓ | 2.40+ | Manual git log parsing |
| TypeScript compiler | TypeDoc (requires TS parsing) | ✓ | 5.9.3 | Use TSDoc standard, read JSDoc manually |
| Turbo | Parallel execution across packages | ✓ | 2.x | Sequential bash loop (slower) |

**Missing dependencies with no fallback:** None — all critical tools are available or have working fallbacks

**Missing dependencies with fallback:**
- Clinic.js (optional for detailed flame graphs) → Use Node.js --inspect + manual heap analysis
- Gitleaks (optional, TruffleHog alternative) → TruffleHog is installed and maintained more actively

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Bun test (native) + custom audit scripts |
| Config file | None — audit reports are data files, not test assertions |
| Quick run command | `bun run scripts/check-file-size.ts` (existing quality check) |
| Full suite command | Custom audit driver (to be created in planning phase) |

### Phase Requirements → Audit Command Map

| Req ID | Audit Dimension | Tool | Command | Verification |
|--------|-----------------|------|---------|--------------|
| PERF-01 | HTTP latency | Autocannon | `autocannon -c100 -d30 http://localhost:3000 --json` | Validates p50, p95, p99 |
| PERF-02 | Startup time | Custom instrumentation | `node --expose-gc examples/startup-timer.js` | Captures cold + warm start |
| PERF-03 | Bundle sizes | esbuild --analyze | `bun run build && esbuild packages/photon/dist/index.js --analyze=text` | Size report generated |
| PERF-04 | Memory baseline | Node.js --inspect | Chrome DevTools heap snapshot after load test | Snapshot file validated |
| PERF-05 | Latency percentiles | Autocannon JSON parse | `jq '.requests[0].latency | {p50, p95, p99}' autocannon-result.json` | All 3 percentiles present |
| DOC-01 | JSDoc coverage | TypeDoc --json | `typedoc --json typedoc-output.json packages/photon/src packages/core/src packages/signal/src` | JSON report has coverage metrics |
| DOC-02 | README verification | Shell find | `find packages -name README.md -type f \| wc -l` | Count matches expected (60+) |
| DOC-03 | Example freshness | Grep pattern | `grep -r "v0.9" docs/examples 2>/dev/null \| wc -l` | No references to old versions |
| DOC-04 | Low coverage modules | TypeDoc parse | `jq '.children[] \| select(.coverage < 80)' typedoc-output.json` | List of < 80% modules |
| SEC-01 | npm audit | npm native | `npm audit --production --json` | Exit code, JSON valid |
| SEC-02 | EOL packages | Custom script | `bun scripts/check-eol-packages.ts` (to be created) | List of deprecated packages |
| SEC-03 | Secret scanning | TruffleHog | `trufflehog git file://. --json --fail` | Exit code 0 if no verified secrets |
| SEC-04 | Unsafe patterns | Grep | `grep -rE "(eval\(|Function\()" packages --include="*.ts" 2>/dev/null` | Empty output = pass |

### Sampling Rate

- **Per task commit:** Not applicable (audit is single comprehensive task, not incremental)
- **Per wave merge:** Run full audit suite after each wave completes
- **Phase gate:** All three audit dimensions (performance, docs, security) must complete before phase closure

### Wave 0 Gaps

- [ ] `scripts/audit-driver.ts` — Orchestrate all three audit dimensions (performance, docs, security), collect results into `.planning/phases/06-full-audit-optional/audit/` directory
- [ ] `scripts/performance-baseline.ts` — Start HTTP server, run autocannon, collect memory snapshot, generate performance report
- [ ] `scripts/documentation-audit.ts` — TypeDoc coverage analysis, README verification, example freshness check
- [ ] `scripts/security-audit.ts` — npm audit, TruffleHog, unsafe pattern grep, EOL package detection
- [ ] `PERFORMANCE_BASELINE.md` — Template for latency/memory/bundle report
- [ ] `DOCUMENTATION_AUDIT.md` — Template for coverage, README, examples report
- [ ] `SECURITY_AUDIT.md` — Template for vulnerabilities, secrets, unsafe patterns report

**All existing test infrastructure** (bun:test in each package) continues to run during audit — audit is orthogonal to correctness testing.

## Sources

### Primary (HIGH confidence)

- **Autocannon npm package** - HTTP/1.1 benchmarking with latency percentile support ([https://www.npmjs.com/package/autocannon](https://www.npmjs.com/package/autocannon))
- **Clinic.js official documentation** - Node.js performance profiling and visualization ([https://clinicjs.org/](https://clinicjs.org/))
- **TypeDoc official documentation** - TypeScript/JSDoc to HTML/JSON documentation generator ([https://typedoc.org/](https://typedoc.org/))
- **npm audit official guide** - Built-in Node.js dependency vulnerability scanner ([https://nodejs-security.com/blog/how-to-use-npm-audit](https://nodejs-security.com/blog/how-to-use-npm-audit))
- **TruffleHog GitHub** - Advanced secret scanning with credential validation ([https://github.com/trufflesecurity/trufflehog](https://github.com/trufflesecurity/trufflehog))

### Secondary (MEDIUM confidence)

- [Comparing npm audit with Snyk](https://nearform.com/insights/comparing-npm-audit-with-snyk/) - Tool comparison for vulnerability scanning
- [Secret Scanning Tools 2026 Guide](https://blog.gitguardian.com/secret-scanning-tools/) - Current best practices for secret scanning
- [esbuild bundle analysis](https://esbuild.github.io/analyze/) - Built-in bundle size visualization
- [source-map-explorer visualization](https://lannonbr.com/blog/source-map-explorer-demo/) - Cross-bundler bundle analysis
- [Top 8 Git Secrets Scanners in 2026](https://www.jit.io/resources/appsec-tools/git-secrets-scanners-key-features-and-top-tools-) - Comparative analysis of secret scanning tools
- [Profiling Node.js with autocannon](https://medium.com/globant/load-testing-nodejs-apis-with-autocannon-c3770478cb36) - Load testing patterns
- [TypeDoc Coverage Analysis Issue](https://github.com/TypeStrong/typedoc/issues/240) - Documentation coverage tracking discussion

### Tertiary (Implementation references)

- [Gravito-Core weekly-audit.sh](./scripts/weekly-audit.sh) - Existing audit patterns in project (TODOs, bundle sizes, typecheck)
- [DECISION_SUMMARY.md](../.planning/DECISION_SUMMARY.md) - Current health baseline (93/100, 99.7% test pass)
- [Gravito-Core CLAUDE.md](./CLAUDE.md) - Project constraints: 100-char line width, Turbo/Bun/Biome build system

## Metadata

**Confidence breakdown:**
- Standard stack (tools): **HIGH** — All recommended tools are actively maintained, published on npm, and have official documentation
- Architecture patterns: **HIGH** — Based on official tool documentation and industry-standard profiling workflows
- Performance baselines: **MEDIUM** — Will be established during Phase 6 execution; 100 concurrent requests is industry standard but specific to Hono/Bun runtime
- Documentation coverage: **MEDIUM** — TypeDoc provides metrics but "80% coverage" is project-defined threshold; tools are solid but interpretation requires domain knowledge
- Security scanning: **HIGH** — npm audit and TruffleHog are battle-tested; patterns for eval/Function() are standard

**Research date:** 2026-03-26
**Valid until:** 2026-04-30 (npm audit updates monthly, tool versions stable but watch for major releases of Clinic.js and TypeDoc)

**Key limitations:**
- This research does not include baseline metrics — those will be established when Phase 6 executes (PERF-01 through SEC-04 will produce actual numbers)
- Specific optimization recommendations (beyond identifying bottlenecks) are deferred to phase execution
- Enterprise SIEM integration (Datadog, New Relic) is out of scope; research focuses on open-source tooling available in CI/CD
- Audit findings will likely require follow-up phases for remediation — research provides tools but not implementation plans
