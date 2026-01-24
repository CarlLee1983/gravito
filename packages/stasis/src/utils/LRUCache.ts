/**
 * A doubly linked list node for the LRU cache.
 */
interface LRUNode<T> {
  key: string
  value: T
  prev: LRUNode<T> | null
  next: LRUNode<T> | null
}

/**
 * A generic LRU (Least Recently Used) cache implementation
 * using a Map and a Doubly Linked List.
 *
 * O(1) for get, set, delete, and eviction.
 */
export class LRUCache<T> {
  private map = new Map<string, LRUNode<T>>()
  private head: LRUNode<T> | null = null
  private tail: LRUNode<T> | null = null

  constructor(
    private maxSize: number,
    private onEvict?: (key: string, value: T) => void
  ) {}

  get size(): number {
    return this.map.size
  }

  has(key: string): boolean {
    return this.map.has(key)
  }

  get(key: string): T | undefined {
    const node = this.map.get(key)
    if (!node) return undefined
    this.moveToHead(node)
    return node.value
  }

  peek(key: string): T | undefined {
    const node = this.map.get(key)
    return node?.value
  }

  set(key: string, value: T): void {
    const existingNode = this.map.get(key)
    if (existingNode) {
      existingNode.value = value
      this.moveToHead(existingNode)
      return
    }

    const newNode: LRUNode<T> = {
      key,
      value,
      prev: null,
      next: this.head,
    }

    if (this.head) {
      this.head.prev = newNode
    }
    this.head = newNode

    if (!this.tail) {
      this.tail = newNode
    }

    this.map.set(key, newNode)

    if (this.maxSize > 0 && this.map.size > this.maxSize) {
      this.evict()
    }
  }

  delete(key: string): boolean {
    const node = this.map.get(key)
    if (!node) return false

    this.removeNode(node)
    this.map.delete(key)
    return true
  }

  clear(): void {
    this.map.clear()
    this.head = null
    this.tail = null
  }

  private moveToHead(node: LRUNode<T>): void {
    if (node === this.head) return

    if (node.prev) {
      node.prev.next = node.next
    }
    if (node.next) {
      node.next.prev = node.prev
    }

    if (node === this.tail) {
      this.tail = node.prev
    }

    node.prev = null
    node.next = this.head

    if (this.head) {
      this.head.prev = node
    }
    this.head = node
  }

  private removeNode(node: LRUNode<T>): void {
    if (node.prev) {
      node.prev.next = node.next
    } else {
      this.head = node.next
    }

    if (node.next) {
      node.next.prev = node.prev
    } else {
      this.tail = node.prev
    }

    node.prev = null
    node.next = null
  }

  private evict(): void {
    if (!this.tail) return

    const node = this.tail
    if (this.onEvict) {
      this.onEvict(node.key, node.value)
    }

    this.removeNode(node)
    this.map.delete(node.key)
  }
}
