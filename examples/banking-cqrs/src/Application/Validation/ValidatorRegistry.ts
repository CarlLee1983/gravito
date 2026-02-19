import type { CommandValidator } from './CommandValidator'

/**
 * Command 驗證器註冊表
 *
 * 以 Command 類別名稱為鍵，儲存對應的驗證器實例。
 * 提供統一的驗證器查找入口，方便 CommandBus 或 Middleware 使用。
 *
 * @example
 * ```typescript
 * const registry = new ValidatorRegistry()
 * registry.register('CreateAccountCommand', new CreateAccountCommandValidator())
 * registry.register('DepositFundsCommand', new DepositFundsCommandValidator())
 *
 * // 在 CommandBus 中使用
 * const validator = registry.getValidator(command.constructor.name)
 * if (validator) {
 *   const result = validator.validate(command)
 *   if (!result.isValid) {
 *     throw new ValidationError(command.constructor.name, result.violations)
 *   }
 * }
 * ```
 */
export class ValidatorRegistry {
  // 使用 unknown 作為泛型上界，實際型別由呼叫端負責
  private readonly validators = new Map<string, CommandValidator<unknown>>()

  /**
   * 註冊 Command 驗證器
   *
   * @param commandName - Command 類別名稱（如 'CreateAccountCommand'）
   * @param validator - 對應的驗證器實例
   */
  register<TCommand>(commandName: string, validator: CommandValidator<TCommand>): void {
    this.validators.set(commandName, validator as CommandValidator<unknown>)
  }

  /**
   * 取得 Command 的驗證器
   *
   * @param commandName - Command 類別名稱
   * @returns 對應的驗證器，若未註冊則回傳 undefined
   */
  getValidator(commandName: string): CommandValidator<unknown> | undefined {
    return this.validators.get(commandName)
  }

  /**
   * 檢查是否已為指定 Command 註冊驗證器
   *
   * @param commandName - Command 類別名稱
   */
  hasValidator(commandName: string): boolean {
    return this.validators.has(commandName)
  }

  /**
   * 取得所有已註冊的 Command 名稱
   */
  getRegisteredCommandNames(): readonly string[] {
    return Array.from(this.validators.keys())
  }
}
