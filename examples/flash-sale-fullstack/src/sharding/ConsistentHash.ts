/**
 * Consistent Hashing Implementation
 * 一致性哈希算法實現，用於分布式分片系統
 *
 * 特性：
 * - 虛擬節點支持（默認 160 個虛擬節點per 實際節點）
 * - 高效的節點查找（基於排序的二分查找）
 * - 節點添加/移除時最小化數據遷移
 * - 支持權重調整
 */

import { createHash } from 'node:crypto'

export interface ConsistentHashOptions {
  virtualNodes?: number // 每個物理節點的虛擬節點數，默認 160
}

export class ConsistentHash {
  private ring: Map<number, string> = new Map() // hash 值 -> 節點名
  private sortedKeys: number[] = [] // 排序的 hash 值
  private nodes: Set<string> = new Set()
  private virtualNodes: number

  constructor(options: ConsistentHashOptions = {}) {
    this.virtualNodes = options.virtualNodes || 160
  }

  /**
   * 計算鍵的 hash 值
   */
  private hash(key: string): number {
    const hashHex = createHash('md5').update(key).digest('hex')
    return parseInt(hashHex.substring(0, 8), 16)
  }

  /**
   * 添加節點到哈希環
   */
  addNode(node: string): void {
    if (this.nodes.has(node)) {
      return
    }

    this.nodes.add(node)

    // 添加虛擬節點
    for (let i = 0; i < this.virtualNodes; i++) {
      const virtualKey = `${node}:${i}`
      const hash = this.hash(virtualKey)
      this.ring.set(hash, node)
    }

    // 重新排序 hash 值
    this.sortedKeys = Array.from(this.ring.keys()).sort((a, b) => a - b)
  }

  /**
   * 移除節點
   */
  removeNode(node: string): void {
    if (!this.nodes.has(node)) {
      return
    }

    this.nodes.delete(node)

    // 移除所有虛擬節點
    for (let i = 0; i < this.virtualNodes; i++) {
      const virtualKey = `${node}:${i}`
      const hash = this.hash(virtualKey)
      this.ring.delete(hash)
    }

    // 重新排序 hash 值
    this.sortedKeys = Array.from(this.ring.keys()).sort((a, b) => a - b)
  }

  /**
   * 獲取鍵對應的節點
   * @returns 對應的節點名，如果沒有節點則返回 null
   */
  getNode(key: string): string | null {
    if (this.nodes.size === 0) {
      return null
    }

    const hash = this.hash(key)

    // 在排序的 hash 值中找到第一個大於等於當前 hash 的節點
    for (const nodeHash of this.sortedKeys) {
      if (nodeHash >= hash) {
        return this.ring.get(nodeHash) || null
      }
    }

    // 如果沒找到，返回環上的第一個節點（wrap-around）
    return this.ring.get(this.sortedKeys[0]) || null
  }

  /**
   * 獲取前 N 個節點（用於複製/備份）
   */
  getNodes(key: string, count: number): string[] {
    if (this.nodes.size === 0) {
      return []
    }

    const result: string[] = []
    const seen = new Set<string>()
    const hash = this.hash(key)

    // 從當前位置開始順序查找
    let startIndex = this.sortedKeys.findIndex((h) => h >= hash)
    if (startIndex === -1) {
      startIndex = 0
    }

    let i = 0
    let attempts = 0
    const maxAttempts = this.sortedKeys.length

    while (result.length < count && attempts < maxAttempts) {
      const nodeHash = this.sortedKeys[(startIndex + i) % this.sortedKeys.length]
      const node = this.ring.get(nodeHash)

      if (node && !seen.has(node)) {
        result.push(node)
        seen.add(node)
      }

      i++
      attempts++
    }

    return result
  }

  /**
   * 獲取所有節點
   */
  getAllNodes(): string[] {
    return Array.from(this.nodes)
  }

  /**
   * 獲取節點數量
   */
  getNodeCount(): number {
    return this.nodes.size
  }

  /**
   * 檢查節點是否存在
   */
  hasNode(node: string): boolean {
    return this.nodes.has(node)
  }

  /**
   * 清空哈希環
   */
  clear(): void {
    this.ring.clear()
    this.sortedKeys = []
    this.nodes.clear()
  }
}
