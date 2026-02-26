# FFI Guide: Connecting Native Code

This guide explains how to prepare native libraries and bind them to your Gravito application using `@gravito/xenon`.

## 1. Preparing the Native Library

### C Example (`math.c`)
Ensure you use `extern "C"` if using C++ and standard calling conventions.

```c
#include <stdint.h>

// Simple addition
int32_t add(int32_t a, int32_t b) {
    return a + b;
}

// Processing a buffer
void process_buffer(uint8_t* data, size_t len) {
    for (size_t i = 0; i < len; i++) {
        data[i] = data[i] * 2;
    }
}
```

Compile it to a shared library:
```bash
gcc -shared -o libmath.so math.c
```

### Rust Example (`lib.rs`)
Rust is highly recommended for building Xenon-compatible libraries due to its safety features.

```rust
#[no_mangle]
pub extern "C" fn add(a: i32, b: i32) -> i32 {
    a + b
}
```

## 2. Defining Bindings in Xenon

Create a definition object for your library:

```typescript
import { FFISymbols } from '@gravito/xenon';

const mathSymbols: FFISymbols = {
  add: {
    args: ['i32', 'i32'],
    returns: 'i32'
  },
  process_buffer: {
    args: ['buffer', 'size_t'],
    returns: 'void'
  }
};
```

## 3. Loading and Using

```typescript
const lib = await core.xenon.load('./libmath.so', mathSymbols);

// Direct call
const result = lib.symbols.add(5, 10);

// Using buffers
const buf = new Uint8Array([1, 2, 3, 4]);
lib.symbols.process_buffer(buf, buf.length);
console.log(buf); // [2, 4, 6, 8]
```

## 4. Supported Types

Xenon supports a wide range of C-compatible types:

| Xenon Type | C Type | TypeScript Type |
|------------|--------|-----------------|
| `i32` | `int32_t` | `number` |
| `u32` | `uint32_t`| `number` |
| `f64` | `double` | `number` |
| `bool` | `bool` | `boolean` |
| `buffer` | `void*` | `Uint8Array` / `Buffer` |
| `string` | `char*` | `string` |
| `size_t` | `size_t` | `number` / `bigint` |

## 5. Security Best Practices

1. **Absolute Paths**: Always use absolute paths for loading libraries in production.
2. **Whitelist Symbols**: Only export and bind the symbols you actually need.
3. **Handle Errors**: Native code failures can be silent or catastrophic. Always wrap Xenon calls in `try/catch` to capture validation errors before they reach the native layer.
