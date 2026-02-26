# Native Memory Management

Memory safety is the biggest challenge when working with FFI. `@gravito/xenon` implements a robust tracking system to prevent common pitfalls like memory leaks and use-after-free errors.

## 1. Buffer Ownership States

Xenon tracks the state of every buffer passed to native code:

- **`OWNED`**: The buffer was allocated by the JavaScript/Bun side. Xenon knows its size and life expectancy.
- **`BORROWED`**: The buffer points to memory allocated by the native library. Xenon can read from it but shouldn't attempt to manage its lifecycle.
- **`FREED`**: The buffer has been explicitly deallocated. Any further access attempt will throw a `XenonMemoryError`.

## 2. Using `createOwnedBuffer`

When you need to pass a large chunk of memory to C for processing, use `createOwnedBuffer`. This ensures the memory is properly aligned and tracked.

```typescript
import { createOwnedBuffer } from '@gravito/xenon';

// Allocate 4MB of tracked memory
const buffer = createOwnedBuffer(4 * 1024 * 1024);

try {
  nativeLib.symbols.fill_data(buffer.ptr, buffer.size);
} finally {
  // If your native code doesn't take ownership, 
  // you can mark it as freed when done if you want to be strict.
  // buffer.free(); 
}
```

## 3. The Memory Tracker

`XenonManager` maintains a `MemoryTracker` that provides real-time statistics on native memory usage.

```typescript
const stats = core.xenon.getMemoryStats();
console.log(`Active native buffers: ${stats.activeBuffers}`);
console.log(`Total allocated: ${stats.totalAllocatedBytes} bytes`);
```

## 4. Preventing "Use-After-Free"

One common crash cause is Bun's Garbage Collector (GC) reclaiming a buffer while the native library is still using it. Xenon prevents this by:

1. **Rooting**: Holding a strong reference to active buffers so the GC won't touch them.
2. **Explicit Lifecycle**: Providing methods to manually control when a buffer is "safe" to be released.

## 5. Tips for Safety

- **Keep it Simple**: Pass simple types whenever possible.
- **Copy vs. Reference**: If performance isn't critical, copy native data into a JS-managed `Uint8Array` rather than holding onto a native pointer (`BORROWED` buffer) for a long time.
- **Always Validate**: Use `isValidPointer()` before performing manual pointer arithmetic.
