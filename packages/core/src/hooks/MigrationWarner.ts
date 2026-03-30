/**
 * Migration warning manager for deprecation warnings.
 *
 * 管理遷移警告訊息，支援透過環境變數抑制特定事件的警告。
 *
 * @internal
 */
export class MigrationWarner {
  private suppressedWarnings: Set<string> = new Set()

  constructor() {
    // 從環境變數載入已抑制的警告
    const suppressed = process.env.GRAVITO_SUPPRESS_MIGRATION_WARNING
    if (suppressed) {
      suppressed.split(',').forEach((event) => {
        this.suppressedWarnings.add(event.trim())
      })
    }
  }

  /**
   * 發出遷移警告訊息。
   *
   * @param eventName - 事件名稱
   * @param message - 警告訊息
   */
  warn(eventName: string, message: string): void {
    if (this.suppressedWarnings.has(eventName)) {
      return
    }

    // biome-ignore lint/suspicious/noConsole: Migration warning system — runs before Logger is bootstrapped, must output to console
    console.warn(`[Gravito Migration] Event "${eventName}" using synchronous dispatch`)
    // biome-ignore lint/suspicious/noConsole: Migration warning system — runs before Logger is bootstrapped, must output to console
    console.warn(`  ${message}`)
    // biome-ignore lint/suspicious/noConsole: Migration warning system — runs before Logger is bootstrapped, must output to console
    console.warn(`  Reference: https://gravito.dev/docs/events/async-migration`)
    // biome-ignore lint/suspicious/noConsole: Migration warning system — runs before Logger is bootstrapped, must output to console
    console.warn(`  To suppress this warning: GRAVITO_SUPPRESS_MIGRATION_WARNING="${eventName}"`)
  }

  /**
   * 抑制特定事件的遷移警告。
   *
   * @param eventName - 要抑制警告的事件名稱
   */
  suppress(eventName: string): void {
    this.suppressedWarnings.add(eventName)
  }
}
