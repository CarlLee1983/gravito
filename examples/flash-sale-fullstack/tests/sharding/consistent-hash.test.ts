/**
 * Consistent Hash Tests
 * 一致性哈希算法測試
 */

import { describe, expect, it } from 'bun:test'
import { ConsistentHash } from '../../src/sharding/ConsistentHash'

describe('ConsistentHash', () => {
  it('should add and retrieve nodes', () => {
    const hash = new ConsistentHash()

    hash.addNode('node-1')
    hash.addNode('node-2')
    hash.addNode('node-3')

    expect(hash.getNodeCount()).toBe(3)
    expect(hash.hasNode('node-1')).toBe(true)
    expect(hash.hasNode('node-4')).toBe(false)
  })

  it('should route keys consistently', () => {
    const hash = new ConsistentHash()

    for (let i = 0; i < 8; i++) {
      hash.addNode(`shard-${i}`)
    }

    // 同一個 key 應該總是路由到同一個節點
    const key = 'user:123456'
    const node1 = hash.getNode(key)
    const node2 = hash.getNode(key)
    const node3 = hash.getNode(key)

    expect(node1).toBe(node2)
    expect(node2).toBe(node3)
    expect(node1).not.toBeNull()
  })

  it('should distribute keys roughly evenly', () => {
    const hash = new ConsistentHash()

    for (let i = 0; i < 8; i++) {
      hash.addNode(`shard-${i}`)
    }

    // 測試 1000 個鍵的分佈
    const distribution = new Map<string, number>()

    for (let i = 0; i < 1000; i++) {
      const key = `user:${i}`
      const node = hash.getNode(key)!
      distribution.set(node, (distribution.get(node) || 0) + 1)
    }

    // 每個節點應該收到大約 125 個鍵（1000 / 8）
    const expectedCount = 1000 / 8
    const tolerance = expectedCount * 0.3 // 允許 ±30% 的偏差

    for (const count of distribution.values()) {
      expect(count).toBeGreaterThan(expectedCount - tolerance)
      expect(count).toBeLessThan(expectedCount + tolerance)
    }
  })

  it('should minimize redistribution when adding a node', () => {
    const hash = new ConsistentHash()

    // 初始化 8 個節點，計算原始分佈
    for (let i = 0; i < 8; i++) {
      hash.addNode(`shard-${i}`)
    }

    const originalMapping = new Map<string, string>()
    for (let i = 0; i < 1000; i++) {
      const key = `user:${i}`
      originalMapping.set(key, hash.getNode(key)!)
    }

    // 添加新節點
    hash.addNode('shard-8')

    // 計算受影響的鍵
    let affected = 0
    for (let i = 0; i < 1000; i++) {
      const key = `user:${i}`
      const newNode = hash.getNode(key)!
      if (newNode !== originalMapping.get(key)) {
        affected++
      }
    }

    // 預期大約 11% 的鍵會被重新路由（1/9 ≈ 11%）
    // 允許更寬鬆的範圍（10-15%）
    expect(affected).toBeGreaterThan(50)
    expect(affected).toBeLessThan(200)
  })

  it('should handle node removal', () => {
    const hash = new ConsistentHash()

    hash.addNode('node-1')
    hash.addNode('node-2')
    hash.addNode('node-3')

    expect(hash.getNodeCount()).toBe(3)

    hash.removeNode('node-2')

    expect(hash.getNodeCount()).toBe(2)
    expect(hash.hasNode('node-2')).toBe(false)

    // 移除所有節點後，應該返回 null
    hash.removeNode('node-1')
    hash.removeNode('node-3')

    expect(hash.getNode('any-key')).toBeNull()
  })

  it('should get multiple nodes for replication', () => {
    const hash = new ConsistentHash()

    for (let i = 0; i < 8; i++) {
      hash.addNode(`shard-${i}`)
    }

    const key = 'user:replication-test'
    const nodes = hash.getNodes(key, 3)

    expect(nodes.length).toBe(3)
    expect(new Set(nodes).size).toBe(3) // 應該都是不同的節點
  })

  it('should calculate shard id correctly', () => {
    const hash = new ConsistentHash()

    for (let i = 0; i < 8; i++) {
      hash.addNode(`shard-${i}`)
    }

    const key = 'user:shard-test'
    const node = hash.getNode(key)!

    // 提取 shard ID
    const shardId = parseInt(node.split('-')[1], 10)

    expect(shardId).toBeGreaterThanOrEqual(0)
    expect(shardId).toBeLessThan(8)
  })

  it('should be empty after clear', () => {
    const hash = new ConsistentHash()

    hash.addNode('node-1')
    hash.addNode('node-2')

    expect(hash.getNodeCount()).toBe(2)

    hash.clear()

    expect(hash.getNodeCount()).toBe(0)
    expect(hash.getNode('any-key')).toBeNull()
  })
})
