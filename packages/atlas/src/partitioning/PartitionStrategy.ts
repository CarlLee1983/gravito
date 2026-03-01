export interface PartitionStrategy<T = any> {
  /**
   * Resolve the partition suffix for a given partition key.
   *
   * @param partitionKey - The key used to calculate the partition (e.g., date, tenant ID).
   * @returns The resolved suffix string (e.g., '202603', 'tenant_a').
   */
  resolveSuffix(partitionKey: T): string
}

export class MonthlyPartitionStrategy implements PartitionStrategy<Date> {
  resolveSuffix(date: Date = new Date()): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    return `${year}${month}` // e.g., '202603'
  }
}

export class DailyPartitionStrategy implements PartitionStrategy<Date> {
  resolveSuffix(date: Date = new Date()): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}${month}${day}` // e.g., '20260301'
  }
}

export class HashPartitionStrategy implements PartitionStrategy<string | number> {
  constructor(private partitionCount: number) {}

  resolveSuffix(key: string | number): string {
    const stringKey = String(key)
    let hash = 2166136261
    for (let i = 0; i < stringKey.length; i++) {
      hash ^= stringKey.charCodeAt(i)
      hash = (hash * 16777619) >>> 0
    }
    const partitionId = hash % this.partitionCount
    return String(partitionId).padStart(3, '0') // e.g., '001', '042'
  }
}
