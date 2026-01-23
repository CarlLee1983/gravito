# @gravito/impulse Optimization Plan

> Form Request validation module for Gravito Framework

## Executive Summary

This document outlines a comprehensive optimization plan for the `@gravito/impulse` package. The plan is divided into 5 phases, each focusing on specific aspects of improvement.

## Current State Analysis

### Package Overview
- **Version**: 1.0.3
- **Purpose**: Laravel-style Form Request validation with Zod/Valibot support
- **Test Coverage**: 70.92% (Lines), 75.86% (Functions)
- **Dependencies**: `zod`, `@gravito/core`
- **Peer Dependencies**: `@gravito/photon`

### Key Components
| Component | Lines | Purpose |
|-----------|-------|---------|
| `FormRequest.ts` | 632 | Core validation class |
| `index.ts` | 23 | Public exports |

### Integration Points
- **Router** (`@gravito/core`): Auto-detection and middleware conversion
- **Astral** (`@gravito/astral`): OpenAPI schema extraction
- **Bridge** (`@gravito/impulse-bridge`): Frontend validation sync

### Current Issues Identified

| Category | Issue | Severity |
|----------|-------|----------|
| Type Safety | Generic `T` in `FormRequest<T>` not properly constrained | Medium |
| Architecture | Single 632-line file contains all logic | Medium |
| Performance | Schema type detection runs on every validation | Low |
| Testing | Uncovered lines: 315, 439-442, 478-567 | Medium |
| DX | No typed inference for `ctx.get('validated')` | High |

---

## Phase Overview

| Phase | Focus Area | Priority | Estimated Effort |
|-------|------------|----------|------------------|
| [Phase 1](./PHASE-1-ARCHITECTURE.md) | Code Quality & Architecture | High | 2-3 days |
| [Phase 2](./PHASE-2-TYPE-SAFETY.md) | Type Safety & DX | High | 2-3 days |
| [Phase 3](./PHASE-3-PERFORMANCE.md) | Performance Optimization | Medium | 1-2 days |
| [Phase 4](./PHASE-4-TESTING.md) | Testing & Coverage | Medium | 2-3 days |
| [Phase 5](./PHASE-5-DOCUMENTATION.md) | Documentation & API | Medium | 1-2 days |

---

## Success Metrics

### Quantitative Goals
- [ ] Test coverage: 70% → **90%+**
- [ ] Build time: Current → **-20%**
- [ ] Bundle size: Monitor & optimize

### Qualitative Goals
- [ ] Full type inference for validated data
- [ ] Zero `any` types in public API
- [ ] Modular file structure
- [ ] Comprehensive JSDoc on all exports

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking API changes | High | Maintain backward compatibility layer |
| Performance regression | Medium | Benchmark before/after each phase |
| Integration breakage | High | Run full monorepo test suite |

---

## Implementation Timeline

```
Week 1: Phase 1 + Phase 2 (Critical improvements)
Week 2: Phase 3 + Phase 4 (Quality & Performance)
Week 3: Phase 5 + Integration testing + Release
```

---

## Quick Links

- [Phase 1: Architecture](./PHASE-1-ARCHITECTURE.md)
- [Phase 2: Type Safety](./PHASE-2-TYPE-SAFETY.md)
- [Phase 3: Performance](./PHASE-3-PERFORMANCE.md)
- [Phase 4: Testing](./PHASE-4-TESTING.md)
- [Phase 5: Documentation](./PHASE-5-DOCUMENTATION.md)
