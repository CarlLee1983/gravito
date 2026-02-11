# Observability and Memory Management 👁️

In production environments, a cache should not be a "black box." `@gravito/stasis` provides comprehensive metrics monitoring and resource protection mechanisms.

---

## 🔒 Memory Protection Mechanism (Prevention)

The most dangerous scenario for in-memory caching (L1) is consuming too much memory and leading to an OOM (Out of Memory) error. Stasis uses the following protections by default:

### 1. LRU Eviction Policy
`MemoryStore` has a built-in **LRU (Least Recently Used)** algorithm. You can precisely limit the cache capacity per instance:

```typescript
stores: {
  local: { 
    driver: 'memory', 
    maxItems: 5000 // Limit to a maximum of 5,000 objects
  }
}
```
When the object count reaches the limit, the system automatically deletes the oldest unused data, ensuring memory consumption stays within a predictable range.

### 2. TTL Lazy Cleanup
Expired data is not actively scanned (to avoid CPU spikes). Instead, it's cleaned up during access or when the buffer is full.

---

## 📊 Real-time Metrics (Observability)

You can extract runtime data from any store instance at any time. These metrics are crucial for diagnosing bottlenecks:

### Key Metrics:
*   **Hits**: Number of times the cache successfully served a request.
*   **Misses**: Number of times a request had to fetch from the database or Redis.
*   **Hit Rate**: `Hits / (Hits + Misses)`. A healthy system should typically be above 70%~80%.
*   **Evictions**: **Critical Indicator**. If this value grows rapidly, it means your `maxItems` is too small, and the cache is frequently thrashing.

### How to Get Stats:
```typescript
const stats = cache.store('memory').getStore().getStats();

console.log(`Hit Rate: ${stats.hitRate}`);
console.log(`Current Size: ${stats.size}`);
console.log(`Items evicted due to capacity: ${stats.evictions}`);
```

---

## 💡 Production Best Practices

1.  **Monitor Evictions**: Export `evictions` metrics to Grafana. If the value is high, you need to increase `maxItems` or shorten the TTL.
2.  **Tiered Configuration**: Place hot data (e.g., configurations, sessions) in L1 and large volumes of data in L2.
3.  **Avoid Large Objects**: Try not to store single objects larger than 1MB in `MemoryStore`.
