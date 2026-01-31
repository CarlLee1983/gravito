/**
 * A doubly linked list node for the LRU cache.
 *
 * Internal structure used to maintain the access order of cached items.
 *
 * @internal
 */
interface LRUNode<T> {
  /**
   * The unique identifier for the cached item.
   */
  key: string
  /**
   * The actual data stored in the cache.
   */
  value: T
  /**
   * Reference to the previous node in the access order (closer to head).
   */
  prev: LRUNode<T> | null
  /**
   * Reference to the next node in the access order (closer to tail).
   */
  next: LRUNode<T> | null
}

/**
 * A generic LRU (Least Recently Used) cache implementation.
 *
 * Uses a Map for O(1) lookups and a Doubly Linked List for O(1) updates to the access order.
 * When the cache reaches its maximum capacity, the least recently accessed item is evicted.
 *
 * @example
 * ```typescript
 * const cache = new LRUCache<number>(100, (key, value) => {
 *   console.log(`Evicted: ${key} = ${value}`);
 * });
 * cache.set('key1', 42);
 * const val = cache.get('key1'); // 42
 * ```
 */
export class LRUCache<T> {
  private map = new Map<string, LRUNode<T>>()
  private head: LRUNode<T> | null = null
  private tail: LRUNode<T> | null = null

  /**
   * Creates a new LRU cache instance.
   *
   * @param maxSize - The maximum number of items allowed in the cache. Set to 0 for unlimited.
   * @param onEvict - Optional callback triggered when an item is evicted due to capacity limits.
   */
  constructor(
    private maxSize: number,
    private onEvict?: (key: string, value: T) => void
  ) {}

  /**
   * The current number of items stored in the cache.
   */
  get size(): number {
    return this.map.size
  }

  /**
   * Checks if a key exists in the cache without updating its access order.
   *
   * @param key - The identifier to look for.
   * @returns True if the key exists, false otherwise.
   */
  has(key: string): boolean {
    return this.map.has(key)
  }

  /**
   * Retrieves an item from the cache and marks it as most recently used.
   *
   * @param key - The identifier of the item to retrieve.
   * @returns The cached value, or undefined if not found.
   *
   * @example
   * ```typescript
   * const value = cache.get('my-key');
   * ```
   */
  get(key: string): T | undefined {
    const node = this.map.get(key)
    if (!node) {
      return undefined
    }
    this.moveToHead(node)
    return node.value
  }

  /**
   * Retrieves an item from the cache without updating its access order.
   *
   * Useful for inspecting the cache without affecting eviction priority.
   *
   * @param key - The identifier of the item to peek.
   * @returns The cached value, or undefined if not found.
   */
  peek(key: string): T | undefined {
    const node = this.map.get(key)
    return node?.value
  }

  /**
   * Adds or updates an item in the cache, marking it as most recently used.
   *
   * If the cache is at capacity, the least recently used item will be evicted.
   *
   * @param key - The identifier for the item.
   * @param value - The data to store.
   *
   * @example
   * ```typescript
   * cache.set('user:1', { name: 'Alice' });
   * ```
   */
  set(key: string, value: T): void {
    const existingNode = this.map.get(key)
    if (existingNode) {
      existingNode.value = value
      this.moveToHead(existingNode)
      return
    }

    if (this.maxSize > 0 && this.map.size >= this.maxSize) {
      this.evict()
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
  }

  /**
   * Removes an item from the cache.
   *
   * @param key - The identifier of the item to remove.
   * @returns True if the item was found and removed, false otherwise.
   */
  delete(key: string): boolean {
    const node = this.map.get(key)
    if (!node) {
      return false
    }

    this.removeNode(node)
    this.map.delete(key)
    return true
  }

  /**
   * Removes all items from the cache.
   */
  clear(): void {
    this.map.clear()
    this.head = null
    this.tail = null
  }

  /**
   * Moves a node to the head of the linked list (most recently used).
   *
   * @param node - The node to promote.
   */
  private moveToHead(node: LRUNode<T>): void {
    if (node === this.head) {
      return
    }

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

  /**
   * Removes a node from the linked list.
   *
   * @param node - The node to remove.
   */
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

  /**
   * Evicts the least recently used item (the tail of the list).
   *
   * Triggers the `onEvict` callback if provided.
   */
  private evict(): void {
    if (!this.tail) {
      return
    }

    const node = this.tail
    if (this.onEvict) {
      this.onEvict(node.key, node.value)
    }

    this.removeNode(node)
    this.map.delete(node.key)
  }
}
