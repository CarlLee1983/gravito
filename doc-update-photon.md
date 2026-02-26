# Documentation Update Plan: @gravito/photon

## Objective
Synchronize `photon` documentation with current Galaxy Architecture (Phase 2.3+) standards, emphasizing Satellite integration, Type-Safe RPC (Beam), and performance benchmarks.

## Tasks

### 1. README.md Enhancements
- [ ] Add **"Galaxy Architecture Role"** section: Describe Photon as the Entry Point for Satellites.
- [ ] Add **"Type-Safe RPC (Beam)"** section: Show how Photon provides the infrastructure for `@gravito/beam`.
- [ ] Update **"Performance"** section: Reference benchmarks from Phase 4 results.
- [ ] Clarify **"Plugin System"**: How Photon acts as a host for Gravito Orbits.

### 2. ARCHITECTURE.md Refinement
- [ ] Detail the **IoC Bridge**: How Hono Context interacts with `@gravito/core` Container.
- [ ] Document **Lifecycle synchronization**: `photon.onStart` -> `core.boot`.
- [ ] Explain **Adapter Strategy**: Why and how we abstraction across Bun/Cloudflare/Node.

### 3. GUIDE.md & Examples Update
- [ ] Add a **"Satellite Route Definition"** example using decorators or manifest.
- [ ] Show **Dependency Injection in Handlers**: How to use `c.get('container')` or similar patterns.
- [ ] Add **Streaming & WebSocket** practical snippets for Real-time apps.

### 4. Cross-Reference
- [ ] Ensure links to `@gravito/core`, `@gravito/beam`, and `@gravito/signal` are up to date.

## Timeline
- **Drafting**: Immediate.
- **Review**: Following core documentation update.
- **Finalize**: Concurrent with Phase 6B cleanup.
