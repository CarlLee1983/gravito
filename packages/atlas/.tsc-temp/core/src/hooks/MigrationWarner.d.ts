/**
 * Migration warning manager for deprecation warnings.
 *
 * 管理遷移警告訊息，支援透過環境變數抑制特定事件的警告。
 *
 * @internal
 */
export declare class MigrationWarner {
  private suppressedWarnings
  constructor()
  /**
   * 發出遷移警告訊息。
   *
   * @param eventName - 事件名稱
   * @param message - 警告訊息
   */
  warn(eventName: string, message: string): void
  /**
   * 抑制特定事件的遷移警告。
   *
   * @param eventName - 要抑制警告的事件名稱
   */
  suppress(eventName: string): void
}
