---
title: Xenon FFI Technical Guide
description: Complete technical guide for using Xenon Secure FFI Layer. Learn about architecture, API reference, security models, and memory management.
---

# 📡 Xenon FFI Technical Guide

## 📋 Table of Contents

1. [Overview](#overview)
2. [Core Architecture](#core-architecture)
3. [API Reference](#api-reference)
4. [Security Model](#security-model)
5. [Memory Management](#memory-management)
6. [Error Handling](#error-handling)
7. [Case Study: SQLite Integration](#case-study-sqlite-integration)
8. [Best Practices](#best-practices)
9. [Performance Considerations](#performance-considerations)

---

## Overview

### What is Xenon?

**Xenon** is the FFI (Foreign Function Interface) security wrapper layer for the Gravito Framework. It provides a secure, observable, and easy-to-use API on top of Bun's native FFI capabilities:

- 🔒 **Security**: Path validation, symbol type checking, and prevention of dangerous operations.
- 🧠 **Memory Management**: Automatic tracking, double-free detection, and leak detection.
- 📊 **Observability**: Detailed memory statistics, symbol registry, and stack traces.
- 🎯 **Developer Experience**: Singleton pattern, configuration-driven, and type-safe.

### Why use Xenon?

Directly using Bun FFI can be risky due to lack of path or type verification:

```typescript
// ❌ Dangerous: No validation
const lib = require('bun').dlopen('/any/path.so', {
  dangerousFunc: { args: ['ptr'], returns: 'ptr' }
})

// ✅ Secure: Xenon validates paths and types
Xenon.load('mylib', '/trusted/path.so', {
  safeFunc: { args: ['i32'], returns: 'i32' }
})
```

---

## Core Architecture

Xenon follows a layered design to separate concerns between user-facing APIs, core orchestration, and native boundaries.

### Key Modules

1.  **Xenon (Static Facade)**: Unified entry point for configuration and operations.
2.  **XenonManager**: Core orchestrator managing library lifecycles.
3.  **LibraryLoader**: Responsible for validating paths and symbols before calling `bun:ffi`.
4.  **MemoryTracker**: Uses `FinalizationRegistry` to detect leaks and handle double-free protection.

---

## API Reference

### Xenon Class

#### `Xenon.configure(config: XenonConfig): void`
Sets the global security policy. Must be called before any `load` operations.

#### `Xenon.load(name: string, config: LoadConfig): LibraryHandle`
Loads a native library and returns a type-safe handle.

#### `Xenon.allocBuffer(size: number, label?: string): Uint8Array`
Allocates memory managed by Xenon. Returns a standard `Uint8Array`.

#### `Xenon.freeBuffer(buffer: Uint8Array | number): void`
Explicitly frees a managed buffer. Throws `XenonMemoryError` on double-free.

---

## Security Model

Xenon's security is built on four layers:
1.  **Blacklist**: System paths like `/etc/**` are strictly blocked.
2.  **Whitelist**: Only paths matching `allowedPaths` are permitted.
3.  **Symbol Validation**: Forbidden types (e.g., `callback`) are blocked.
4.  **Resource Limits**: `maxMemory` prevents DoS via memory exhaustion.

---

## Memory Management

### Ownership Model
- **Owned Buffers**: Allocated via `Xenon.allocBuffer()`. Developer is responsible for calling `freeBuffer()`.
- **Borrowed Buffers**: Wrapped around existing pointers (e.g., returned from native code). Xenon tracks them but does not manage their release.

### Leak Detection
Xenon uses `FinalizationRegistry` to automatically log warnings if an owned buffer is garbage collected without being explicitly freed.

---

## Case Study: SQLite Integration

Xenon is perfect for wrapping complex native libraries like SQLite. A **SQLite Satellite** typically involves:
1.  Configuring Xenon whitelist for `libsqlite3`.
2.  Defining FFI symbols for `sqlite3_open`, `sqlite3_exec`, etc.
3.  Managing DB pointers using Xenon managed buffers.

---

## Best Practices

1.  **Restrictive Policies**: Only allow the specific libraries you need.
2.  **Pair Alloc/Free**: Always use `try...finally` to ensure buffers are freed.
3.  **Use Labels**: Label your buffers for easier debugging of memory statistics.
4.  **Fail Fast**: Validate your FFI setup during the application `boot` phase.

---

## Performance Considerations

- **Buffer Reuse**: Reuse long-lived buffers instead of frequent allocation/deallocation.
- **Batching**: Group native calls into single transactions to minimize FFI round-trip overhead.
- **Production Mode**: Disable memory tracking in high-performance production environments if code is verified.

---

**Version**: 1.0.0
**Last Updated**: 2026-02-26
