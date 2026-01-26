import type { PasswordRulesConfig } from '../config'

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export class StrengthValidator {
  private weakSet: Set<string>

  constructor(
    private rules: PasswordRulesConfig,
    weakList?: string[]
  ) {
    this.weakSet = new Set(weakList || [])
  }

  check(input: string): ValidationResult {
    const errors: string[] = []

    if (this.rules.minLength && input.length < this.rules.minLength) {
      errors.push(`Must be at least ${this.rules.minLength} characters long`)
    }

    if (this.rules.maxLength && input.length > this.rules.maxLength) {
      errors.push(`Cannot exceed ${this.rules.maxLength} characters`)
    }

    if (this.rules.requireUppercase && !/[A-Z]/.test(input)) {
      errors.push('Must contain at least one uppercase letter')
    }

    if (this.rules.requireLowercase && !/[a-z]/.test(input)) {
      errors.push('Must contain at least one lowercase letter')
    }

    if (this.rules.requireNumbers && !/\d/.test(input)) {
      errors.push('Must contain at least one number')
    }

    if (this.rules.requireSymbols && !/[!@#$%^&*(),.?":{}|<>]/.test(input)) {
      errors.push('Must contain at least one special character')
    }

    if (this.rules.preventCommon && this.weakSet.has(input.toLowerCase())) {
      errors.push('This value is too common. Please choose a more secure one')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  addWeak(value: string): void {
    this.weakSet.add(value.toLowerCase())
  }

  removeWeak(value: string): void {
    this.weakSet.delete(value.toLowerCase())
  }
}
