# Benchmark Report

## Baseline Results

### MemoryDriver

| Operation | Ops/Sec | Duration (10k ops) |
| --- | --- | --- |
| push | 535,174 | 18.69ms |
| pop | 158,715 | 63.01ms |
| pushMany (100 items) | 19,995 | 5.00ms (100 batches) |
| popMany (100 items) | 2,616 | 38.22ms (100 batches) |

### RedisDriver

| Operation | Ops/Sec | Duration (1k ops) |
| --- | --- | --- |
| push | 701 | 1424.99ms |
| pop | 161 | 6187.44ms |
| pushMany (100 items) | 1,601 | 62.44ms (100 batches) |
| popMany (100 items) | 69 | 1435.60ms (100 batches) |

## Analysis

- **MemoryDriver** is extremely fast, as expected.
- **RedisDriver** shows significant overhead, especially for `pop`.
- `RedisDriver.pop` is much slower than `push` (161 ops/sec vs 701 ops/sec). This is likely due to the polling logic which checks multiple priorities (critical, high, default, low) and delayed queues, resulting in multiple Redis round trips per pop call.
- `RedisDriver.popMany` is also very slow (69 ops/sec). The current implementation iterates and calls `pop` (which itself does multiple checks) for each item. This confirms the hypothesis in the optimization plan that `popMany` needs optimization.
- `RedisDriver.pushMany` is reasonably fast because it uses `lpush` with multiple arguments when possible, but `popMany` is a clear bottleneck.

## Goals for Optimization

1. **Optimize `RedisDriver.pop`**: Reduce round trips using Lua scripts or better data structures.
2. **Optimize `RedisDriver.popMany`**: Implement a Lua script to pop multiple items in a single round trip.
3. **Type Safety**: The codebase has many `any` types which need to be addressed.
