export interface PartitionStrategy<T = any> {
  /**
   * Resolve the partition suffix for a given partition key.
   *
   * @param partitionKey - The key used to calculate the partition (e.g., date, tenant ID).
   * @returns The resolved suffix string (e.g., '202603', 'tenant_a').
   */
  resolveSuffix(partitionKey: T): string
}
export declare class MonthlyPartitionStrategy implements PartitionStrategy<Date> {
  resolveSuffix(date?: Date): string
}
export declare class DailyPartitionStrategy implements PartitionStrategy<Date> {
  resolveSuffix(date?: Date): string
}
export declare class HashPartitionStrategy implements PartitionStrategy<string | number> {
  private partitionCount
  constructor(partitionCount: number)
  resolveSuffix(key: string | number): string
}
