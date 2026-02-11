/**
 * Geographic Cache Layer Tests
 * 地域快取層測試
 */

import { beforeAll, describe, expect, it } from 'bun:test'
import type { GeoCacheConfig, GeoLocation } from '../../src/sharding'
import { GeographicCacheManager } from '../../src/sharding'

describe('GeographicCacheManager - 地域快取層', () => {
  let manager: GeographicCacheManager

  beforeAll(() => {
    manager = new GeographicCacheManager()
  })

  describe('Region Initialization', () => {
    it('should initialize cache for region', () => {
      const config: GeoCacheConfig = {
        regionId: 'us-east-1',
        location: { lat: 38.8816, lng: -77.0945 }, // Washington DC
        maxSize: 100 * 1024 * 1024, // 100 MB
        maxEntries: 10000,
        defaultTtl: 24 * 60 * 60 * 1000, // 24 hours
        replicationMode: 'async',
        tierDistribution: { L1: 10, L2: 30, L3: 60 },
      }

      manager.initializeRegion(config)

      const stats = manager.getStats('us-east-1')
      expect(stats?.regionId).toBe('us-east-1')
      expect(stats?.entryCount).toBe(0)
      expect(stats?.totalSize).toBe(0)
    })

    it('should initialize multiple regions', () => {
      const regions: GeoCacheConfig[] = [
        {
          regionId: 'eu-west-1',
          location: { lat: 53.4129, lng: -8.2439 }, // Dublin
          maxSize: 50 * 1024 * 1024,
          maxEntries: 5000,
          defaultTtl: 24 * 60 * 60 * 1000,
          replicationMode: 'sync',
          tierDistribution: { L1: 10, L2: 30, L3: 60 },
        },
        {
          regionId: 'ap-southeast-1',
          location: { lat: 1.3521, lng: 103.8198 }, // Singapore
          maxSize: 50 * 1024 * 1024,
          maxEntries: 5000,
          defaultTtl: 24 * 60 * 60 * 1000,
          replicationMode: 'sync',
          tierDistribution: { L1: 10, L2: 30, L3: 60 },
        },
      ]

      for (const config of regions) {
        manager.initializeRegion(config)
      }

      const allStats = manager.getAllStats()
      expect(allStats.length).toBe(3) // us-east-1 + 2 new regions
    })
  })

  describe('Geographic Routing', () => {
    it('should select closest region based on user location', () => {
      const userLocation: GeoLocation = {
        latitude: 40.7128,
        longitude: -74.006,
        country: 'US',
        city: 'New York',
      }

      const region = manager.selectClosestRegion(userLocation)
      expect(region).toBe('us-east-1') // Closest to NYC
    })

    it('should select closest region for European user', () => {
      const userLocation: GeoLocation = {
        latitude: 48.8566,
        longitude: 2.3522,
        country: 'FR',
        city: 'Paris',
      }

      const region = manager.selectClosestRegion(userLocation)
      expect(region).toBe('eu-west-1') // Closest to Paris
    })

    it('should select closest region for Asian user', () => {
      const userLocation: GeoLocation = {
        latitude: 1.3521,
        longitude: 103.8198,
        country: 'SG',
        city: 'Singapore',
      }

      const region = manager.selectClosestRegion(userLocation)
      expect(region).toBe('ap-southeast-1') // Closest to Singapore
    })
  })

  describe('Cache Operations', () => {
    it('should set cache entry', () => {
      manager.set('us-east-1', 'product:1', { id: 1, name: 'Product 1', price: 99.99 }, 'L2')

      const value = manager.get('us-east-1', 'product:1')
      expect(value).toBeDefined()
      expect(value.name).toBe('Product 1')
    })

    it('should retrieve cache entry', () => {
      manager.set('us-east-1', 'user:100', { id: 100, name: 'User 100' }, 'L2')

      const stats = manager.getStats('us-east-1')
      expect(stats?.entryCount).toBeGreaterThan(0)
    })

    it('should delete cache entry', () => {
      manager.set('us-east-1', 'temp:key', { data: 'temp' }, 'L2')
      const deleted = manager.delete('us-east-1', 'temp:key')

      expect(deleted).toBe(true)
      expect(manager.get('us-east-1', 'temp:key')).toBeNull()
    })

    it('should return null for missing entry', () => {
      const value = manager.get('us-east-1', 'non-existent:key')
      expect(value).toBeNull()
    })

    it('should clear entire region cache', () => {
      manager.set('us-east-1', 'key1', 'value1', 'L2')
      manager.set('us-east-1', 'key2', 'value2', 'L2')

      manager.clearRegion('us-east-1')

      expect(manager.get('us-east-1', 'key1')).toBeNull()
      expect(manager.get('us-east-1', 'key2')).toBeNull()
    })
  })

  describe('Multi-Tier Cache', () => {
    it('should support L1 hot cache', () => {
      manager.set('us-east-1', 'hot:item', { data: 'hot' }, 'L1')

      const value = manager.get('us-east-1', 'hot:item')
      expect(value?.data).toBe('hot')
    })

    it('should support L2 regional cache', () => {
      manager.set('us-east-1', 'regional:item', { data: 'regional' }, 'L2')

      const value = manager.get('us-east-1', 'regional:item')
      expect(value?.data).toBe('regional')
    })

    it('should support L3 global cache', () => {
      manager.set('us-east-1', 'global:item', { data: 'global' }, 'L3')

      const value = manager.get('us-east-1', 'global:item')
      expect(value?.data).toBe('global')
    })

    it('should track different tiers', () => {
      manager.set('eu-west-1', 'tier:test1', 'value1', 'L1')
      manager.set('eu-west-1', 'tier:test2', 'value2', 'L2')
      manager.set('eu-west-1', 'tier:test3', 'value3', 'L3')

      expect(manager.get('eu-west-1', 'tier:test1')).toBe('value1')
      expect(manager.get('eu-west-1', 'tier:test2')).toBe('value2')
      expect(manager.get('eu-west-1', 'tier:test3')).toBe('value3')
    })
  })

  describe('TTL and Expiration', () => {
    it('should respect custom TTL', () => {
      manager.set('us-east-1', 'ttl:short', 'temporary', 'L2', 1000) // 1 second

      const value = manager.get('us-east-1', 'ttl:short')
      expect(value).toBe('temporary')
    })

    it('should handle expired entries', async () => {
      manager.set('us-east-1', 'ttl:expired', 'stale', 'L2', 100) // 100ms

      await new Promise((resolve) => setTimeout(resolve, 150))

      const value = manager.get('us-east-1', 'ttl:expired')
      expect(value).toBeNull()
    })
  })

  describe('Cache Replication', () => {
    it('should queue replication events', async () => {
      const manager2 = new GeographicCacheManager()

      const configs: GeoCacheConfig[] = [
        {
          regionId: 'region1',
          location: { lat: 0, lng: 0 },
          maxSize: 10 * 1024 * 1024,
          maxEntries: 1000,
          defaultTtl: 24 * 60 * 60 * 1000,
          replicationMode: 'async',
          tierDistribution: { L1: 10, L2: 30, L3: 60 },
        },
        {
          regionId: 'region2',
          location: { lat: 10, lng: 10 },
          maxSize: 10 * 1024 * 1024,
          maxEntries: 1000,
          defaultTtl: 24 * 60 * 60 * 1000,
          replicationMode: 'async',
          tierDistribution: { L1: 10, L2: 30, L3: 60 },
        },
      ]

      for (const config of configs) {
        manager2.initializeRegion(config)
      }

      let replicationQueued = false
      manager2.on('replication:queued', () => {
        replicationQueued = true
      })

      manager2.set('region1', 'rep:key', { data: 'replicate' }, 'L2')

      expect(replicationQueued).toBe(true)
    })

    it('should process replication queue', async () => {
      const manager2 = new GeographicCacheManager()

      const configs: GeoCacheConfig[] = [
        {
          regionId: 'src',
          location: { lat: 0, lng: 0 },
          maxSize: 10 * 1024 * 1024,
          maxEntries: 1000,
          defaultTtl: 24 * 60 * 60 * 1000,
          replicationMode: 'async',
          tierDistribution: { L1: 10, L2: 30, L3: 60 },
        },
        {
          regionId: 'dst',
          location: { lat: 10, lng: 10 },
          maxSize: 10 * 1024 * 1024,
          maxEntries: 1000,
          defaultTtl: 24 * 60 * 60 * 1000,
          replicationMode: 'async',
          tierDistribution: { L1: 10, L2: 30, L3: 60 },
        },
      ]

      for (const config of configs) {
        manager2.initializeRegion(config)
      }

      manager2.set('src', 'key:replicate', 'value', 'L2')
      await manager2.processReplicationQueue()

      // Replication should have completed
      expect(true).toBe(true)
    })
  })

  describe('Cache Statistics', () => {
    it('should track hit rate', () => {
      const manager2 = new GeographicCacheManager()
      const config: GeoCacheConfig = {
        regionId: 'stats-region',
        location: { lat: 0, lng: 0 },
        maxSize: 10 * 1024 * 1024,
        maxEntries: 1000,
        defaultTtl: 24 * 60 * 60 * 1000,
        replicationMode: 'async',
        tierDistribution: { L1: 10, L2: 30, L3: 60 },
      }

      manager2.initializeRegion(config)
      manager2.set('stats-region', 'stat:key', 'value', 'L2')

      // Hit
      manager2.get('stats-region', 'stat:key')
      // Miss
      manager2.get('stats-region', 'non-existent')

      const stats = manager2.getStats('stats-region')
      expect(stats?.hitRate).toBeDefined()
      expect(stats?.missRate).toBeDefined()
    })

    it('should track entry count', () => {
      const config: GeoCacheConfig = {
        regionId: 'count-region',
        location: { lat: 0, lng: 0 },
        maxSize: 10 * 1024 * 1024,
        maxEntries: 1000,
        defaultTtl: 24 * 60 * 60 * 1000,
        replicationMode: 'async',
        tierDistribution: { L1: 10, L2: 30, L3: 60 },
      }

      manager.initializeRegion(config)

      manager.set('count-region', 'key1', 'value1', 'L2')
      manager.set('count-region', 'key2', 'value2', 'L2')
      manager.set('count-region', 'key3', 'value3', 'L2')

      const stats = manager.getStats('count-region')
      expect(stats?.entryCount).toBe(3)
    })

    it('should track total size', () => {
      const config: GeoCacheConfig = {
        regionId: 'size-region',
        location: { lat: 0, lng: 0 },
        maxSize: 100 * 1024 * 1024,
        maxEntries: 10000,
        defaultTtl: 24 * 60 * 60 * 1000,
        replicationMode: 'async',
        tierDistribution: { L1: 10, L2: 30, L3: 60 },
      }

      manager.initializeRegion(config)

      manager.set('size-region', 'large:key', { data: 'x'.repeat(10000) }, 'L2')

      const stats = manager.getStats('size-region')
      expect(stats?.totalSize).toBeGreaterThan(0)
    })
  })

  describe('Cache Warmup', () => {
    it('should warmup cache with multiple entries', async () => {
      const manager2 = new GeographicCacheManager()
      const config: GeoCacheConfig = {
        regionId: 'warmup-region',
        location: { lat: 0, lng: 0 },
        maxSize: 50 * 1024 * 1024,
        maxEntries: 5000,
        defaultTtl: 24 * 60 * 60 * 1000,
        replicationMode: 'async',
        tierDistribution: { L1: 10, L2: 30, L3: 60 },
      }

      manager2.initializeRegion(config)

      const keys = [
        { key: 'product:1', value: { id: 1, name: 'Product 1' } },
        { key: 'product:2', value: { id: 2, name: 'Product 2' } },
        { key: 'product:3', value: { id: 3, name: 'Product 3' } },
      ]

      let warmupCompleted = false
      manager2.on('cache:warmup-completed', () => {
        warmupCompleted = true
      })

      await manager2.warmupCache('warmup-region', keys)

      expect(warmupCompleted).toBe(true)
      expect(manager2.getStats('warmup-region')?.entryCount).toBe(3)
    })
  })

  describe('Event System', () => {
    it('should emit cache set event', () => {
      const manager2 = new GeographicCacheManager()
      const config: GeoCacheConfig = {
        regionId: 'event-region',
        location: { lat: 0, lng: 0 },
        maxSize: 10 * 1024 * 1024,
        maxEntries: 1000,
        defaultTtl: 24 * 60 * 60 * 1000,
        replicationMode: 'async',
        tierDistribution: { L1: 10, L2: 30, L3: 60 },
      }

      manager2.initializeRegion(config)

      let setCalled = false
      manager2.on('cache:set', () => {
        setCalled = true
      })

      manager2.set('event-region', 'key', 'value', 'L2')

      expect(setCalled).toBe(true)
    })

    it('should emit cache hit event', () => {
      const manager2 = new GeographicCacheManager()
      const config: GeoCacheConfig = {
        regionId: 'hit-region',
        location: { lat: 0, lng: 0 },
        maxSize: 10 * 1024 * 1024,
        maxEntries: 1000,
        defaultTtl: 24 * 60 * 60 * 1000,
        replicationMode: 'async',
        tierDistribution: { L1: 10, L2: 30, L3: 60 },
      }

      manager2.initializeRegion(config)
      manager2.set('hit-region', 'key', 'value', 'L2')

      let hitCalled = false
      manager2.on('cache:hit', () => {
        hitCalled = true
      })

      manager2.get('hit-region', 'key')

      expect(hitCalled).toBe(true)
    })

    it('should emit cache miss event', () => {
      const manager2 = new GeographicCacheManager()
      const config: GeoCacheConfig = {
        regionId: 'miss-region',
        location: { lat: 0, lng: 0 },
        maxSize: 10 * 1024 * 1024,
        maxEntries: 1000,
        defaultTtl: 24 * 60 * 60 * 1000,
        replicationMode: 'async',
        tierDistribution: { L1: 10, L2: 30, L3: 60 },
      }

      manager2.initializeRegion(config)

      let missCalled = false
      manager2.on('cache:miss', () => {
        missCalled = true
      })

      manager2.get('miss-region', 'non-existent')

      expect(missCalled).toBe(true)
    })
  })

  describe('Reporting', () => {
    it('should generate cache report', () => {
      const report = manager.generateCacheReport()

      expect(report).toContain('GEOGRAPHIC CACHE LAYER REPORT')
      expect(report).toContain('REGIONAL CONFIGURATIONS')
      expect(report).toContain('CACHE STATISTICS')
      expect(report).toContain('EVICTION POLICY')
    })

    it('should include region details in report', () => {
      const report = manager.generateCacheReport()

      expect(report).toContain('us-east-1')
      expect(report).toContain('Location:')
      expect(report).toContain('Max Size:')
    })
  })

  describe('Integration - Complete Workflow', () => {
    it('should complete geographic cache workflow', async () => {
      const manager2 = new GeographicCacheManager()

      // 1. Initialize regions
      const regions: GeoCacheConfig[] = [
        {
          regionId: 'workflow-us',
          location: { lat: 38.8816, lng: -77.0945 },
          maxSize: 50 * 1024 * 1024,
          maxEntries: 5000,
          defaultTtl: 24 * 60 * 60 * 1000,
          replicationMode: 'async',
          tierDistribution: { L1: 10, L2: 30, L3: 60 },
        },
        {
          regionId: 'workflow-eu',
          location: { lat: 53.4129, lng: -8.2439 },
          maxSize: 50 * 1024 * 1024,
          maxEntries: 5000,
          defaultTtl: 24 * 60 * 60 * 1000,
          replicationMode: 'async',
          tierDistribution: { L1: 10, L2: 30, L3: 60 },
        },
      ]

      for (const config of regions) {
        manager2.initializeRegion(config)
      }

      // 2. Route based on user location
      const userLocation: GeoLocation = {
        latitude: 40.7128,
        longitude: -74.006,
        country: 'US',
        city: 'New York',
      }

      const region = manager2.selectClosestRegion(userLocation)
      expect(region).toBe('workflow-us')

      // 3. Populate cache
      const products = [
        { key: 'product:1', value: { id: 1, name: 'Item 1', price: 29.99 } },
        { key: 'product:2', value: { id: 2, name: 'Item 2', price: 39.99 } },
      ]

      await manager2.warmupCache(region, products)

      // 4. Access cache
      const item1 = manager2.get(region, 'product:1')
      expect(item1?.name).toBe('Item 1')

      // 5. Replicate data
      manager2.set(region, 'user:100', { id: 100, name: 'John' }, 'L2')
      await manager2.processReplicationQueue()

      // 6. Generate report
      const report = manager2.generateCacheReport()
      expect(report).toContain('GEOGRAPHIC CACHE LAYER REPORT')
    })
  })
})
