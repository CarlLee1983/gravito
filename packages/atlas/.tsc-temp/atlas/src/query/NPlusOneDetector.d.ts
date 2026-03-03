export declare class NPlusOneDetector {
  private static queryCounts
  private static timeframe
  private static threshold
  private static enabled
  static track(tableName: string, sql: string, structureKey: string): void
  static reset(): void
  static setEnabled(enabled: boolean): void
  private static warn
}
