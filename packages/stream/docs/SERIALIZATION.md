# Serialization Guide

@gravito/stream supports multiple serialization strategies to optimize performance and payload size.

## Available Serializers

### 1. Class Name Serializer (Default)
The default serializer. It stores the class name and properties, allowing the job to be fully restored as a class instance upon deserialization.

**Pros:**
- Restores class methods and behavior.
- Easy to use (standard OOP).

**Cons:**
- Larger payload (includes class name).
- Slower than pure JSON.

### 2. JSON Serializer
Serializes the job as a plain JSON object.

**Pros:**
- Fast deserialization.
- Human-readable.
- Standard.

**Cons:**
- **Does not restore class instances**. Jobs become plain objects. Methods are lost.
- Larger payload than MessagePack.

### 3. MessagePack Serializer (New)
Uses MessagePack (binary format) encoded as Base64.

**Pros:**
- **Smaller payload** (~15-20% smaller than JSON).
- **Faster serialization** (~40% faster than JSON).
- Supports more types (Date, Map, Set, Uint8Array).

**Cons:**
- **Slower deserialization** (~2x slower than JSON due to Base64 decoding).
- Requires optional dependency: `@msgpack/msgpack`.
- **Does not restore class instances**.

## Serialization Caching (New)

You can enable serialization caching to prevent re-serializing the same Job instance multiple times. This is useful when you reuse Job objects or push the same job to multiple queues/connections.

### Enable Caching

```typescript
const manager = new QueueManager({
  useSerializationCache: true
})
```

**Performance:**
- Cache Hit: < 10 nanoseconds (Instant)
- Cache Miss: Standard serialization time

## Using MessagePack

1. Install the dependency:
   ```bash
   bun add @msgpack/msgpack
   ```

2. Configure QueueManager:
   ```typescript
   const manager = new QueueManager({
     defaultSerializer: 'msgpack'
   })
   ```

## Benchmark Results

| Strategy | Serialization | Deserialization | Payload Size |
|----------|---------------|-----------------|--------------|
| JSON | ~55 µs | ~23 µs | 100% (Baseline) |
| MessagePack | ~32 µs | ~56 µs | ~86% (-14%) |
| Cached | ~0.003 µs | N/A | N/A |

*Benchmarks run on Apple M4, Bun 1.1.27*
