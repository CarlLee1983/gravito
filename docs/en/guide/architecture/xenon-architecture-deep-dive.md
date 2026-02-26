---
title: Xenon FFI Architecture Deep Dive
description: In-depth analysis of the Xenon Secure FFI Layer architecture, design decisions, memory model, and security mechanisms.
---

# 📡 Xenon FFI Architecture Deep Dive

## Table of Contents

1. [Design Decisions](#design-decisions)
2. [Inter-Module Communication](#inter-module-communication)
3. [Security Mechanisms](#security-mechanisms)
4. [Memory Model](#memory-model)
5. [Extension Points](#extension-points)
6. [Known Limitations](#known-limitations)

---

## Design Decisions

### Decision 1: Singleton Pattern

**Choice**: Static `Xenon` Facade + Internal `XenonManager` Singleton.

**Reasoning**:

```typescript
// ✅ Singleton: Global configuration once
Xenon.configure({ ... })
Xenon.load(...)
Xenon.allocBuffer(...)

// vs.

// ❌ Non-singleton: Passing config every time
const manager = new XenonManager({ ... })
manager.load(...)
manager.allocBuffer(...)
```

FFI security policies are inherently global (system-level). An application should have a single, consistent policy. The singleton ensures:
- Configuration is set only once.
- All library loads follow the same security rules.
- Global memory statistics are meaningful.

**Trade-offs**:

| Pros | Cons |
|------|------|
| Globally consistent security | Difficult for multi-tenant apps (rarely needed for FFI) |
| Simple API | Requires `reset()` for testing |
| Global memory tracking | Thread safety (handled by Bun's single-threaded nature) |

### Decision 2: Ownership Distinction

**Choice**: `owned` vs `borrowed` buffers.

```typescript
// Owned: Xenon manages the lifecycle
const owned = Xenon.allocBuffer(256)
Xenon.freeBuffer(owned)

// Borrowed: External entity manages the lifecycle
const borrowed = manager.borrowBuffer(ptr, len, 'label')
// Do NOT call freeBuffer()
```

**Reasoning**:

Not all memory is allocated by Xenon. FFI functions may return pointers:

```typescript
// Assuming library definition: void* lib_create_context()
const ctxPtr = lib.call('lib_create_context')
// Pointer is owned by the library, cannot be freed by Xenon

// Xenon needs to know this
const ctxMeta = manager.borrowBuffer(ctxPtr, 0, 'lib_context')
// Memory tracker now knows this is borrowed
```

### Decision 3: Double-Free Detection

**Choice**: Tracking `freed` flag + preventing subsequent releases.

```typescript
const buf = Xenon.allocBuffer(256)
Xenon.freeBuffer(buf)
Xenon.freeBuffer(buf) // ❌ Detection: freed=true
```

**Reasoning**:

Double-freeing is a common memory error:

```c
// In native code
void* ptr = malloc(256);
free(ptr);
free(ptr); // ❌ Heap corruption
```

Xenon cannot prevent this entirely (as Bun doesn't track pointer validity), but it can detect repeated releases at the application level.

### Decision 4: Path Matching (Simple Wildcards)

**Choice**: Support for `*` wildcard (no support for `?`, `[...]`).

```typescript
Xenon.configure({
  allowedPaths: [
    '/usr/lib/lib*.so',        // ✅ Simple asterisk
    '/opt/lib/lib*.so.1.*',    // ✅ Multiple asterisks
  ],
  blockedPaths: [
    '/etc/**',                 // ✅ Double asterisk (recursive)
  ]
})
```

**Reasoning**:

Full glob patterns are complex and prone to bypasses. Simple wildcards cover most use cases while remaining secure and performant.

### Decision 5: FinalizationRegistry for Leak Detection

**Choice**: Use `FinalizationRegistry` to monitor owned buffers.

**Reasoning**:

Xenon cannot force an application to call `freeBuffer()`. `FinalizationRegistry` provides a fallback detection:

```javascript
function badCode() {
  const buf = Xenon.allocBuffer(1024)  // ✅ Allocated
  return buf.data                      // ❌ Forgot to free
}

badCode()
// ...later during GC...
// [Xenon] Memory leak detected: ...
```

---

## Inter-Module Communication

### Data Flow: load() Operation

```
Xenon.load(name, path, symbols)
    ↓
XenonManager.load()
    ↓
LibraryLoader.load()
    │
    ├─ validatePath(path)
    │     ├─ Check blockedPaths (Blacklist priority)
    │     └─ Check allowedPaths (Whitelist)
    │
    ├─ validateSymbols(symbols)
    │     ├─ TypeGuard.validateSymbolDef()
    │     │     ├─ Check return type
    │     │     └─ Check arg types
    │     └─ Forbidden types (e.g., callback)
    │
    └─ FFILoader(path, symbols)  // bun:ffi
          └─ dlopen(path, symbols)
    ↓
LibraryHandleImpl (wraps dlHandle)
    ↓
Returned to caller
```

---

## Security Mechanisms

### 1. Path Validation Levels

1.  **Level 1: Blacklist (Highest Priority)**: System paths like `/etc/**`, `/sys/**` are never allowed.
2.  **Level 2: Whitelist**: If `allowedPaths` is set, the path must match one of the entries.
3.  **Level 3: Default Pass**: If no whitelist is set, non-blacklisted paths are allowed.

### 2. Type Validation

Xenon prevents the use of dangerous types like `callback` by default to ensure runtime stability and prevent unexpected execution flows originating from native code.

### 3. Memory Limit Enforcement

Xenon tracks the total allocated memory across all buffers. If a new allocation exceeds the configured `maxMemory` limit, it throws a `XenonMemoryError`.

---

## Memory Model

### Virtual Pointer System

Xenon uses a virtual pointer system to track buffers. Since Bun's `Uint8Array` doesn't expose raw memory addresses directly, Xenon assigns a unique virtual ID to each managed buffer.

---

## Extension Points

1.  **Custom FFI Loader**: Inject your own loader logic to intercept `dlopen` calls.
2.  **Bounds Checker**: Future module for runtime bounds verification.
3.  **Custom Memory Tracker**: Replace the tracker to implement custom strategies like memory pooling.

---

## Known Limitations

1.  **No Runtime Bounds Checking**: Xenon tracks buffer size but cannot detect out-of-bounds access *inside* native C functions.
2.  **Use-After-Free**: Xenon cannot prevent access to a buffer after it has been freed at the native level.
3.  **Single-Threaded Assumption**: Optimized for Bun's single-threaded event loop. Not thread-safe if used across multiple workers without separate managers.

---

**Version**: 1.0.0
**Last Updated**: 2026-02-26
