/**
 * FFI Type Validation
 * Ensures only safe types are used in FFI function signatures
 */

import { XenonTypeError } from '../errors'
import type { FFISymbolDef, FFISymbols, FFIType, TypeValidationResult } from '../types'

/**
 * Valid FFI types supported by Xenon
 */
const VALID_TYPES: Set<FFIType> = new Set([
  'i8',
  'i16',
  'i32',
  'i64',
  'u8',
  'u16',
  'u32',
  'u64',
  'f32',
  'f64',
  'bool',
  'ptr',
  'void',
  'cstring',
])

/**
 * Dangerous types that are explicitly forbidden
 */
const FORBIDDEN_TYPES: Set<string> = new Set(['callback'])

/**
 * Validate a single FFI type
 * @param type Type to validate
 * @returns true if type is valid
 */
export function validateType(type: string): boolean {
  return VALID_TYPES.has(type as FFIType)
}

/**
 * Validate a single symbol definition
 * Checks for:
 * - Valid argument types
 * - Valid return type
 * - No callback types
 * @param symbol Symbol name
 * @param def Symbol definition
 * @returns Validation result
 */
export function validateSymbolDef(symbol: string, def: FFISymbolDef): TypeValidationResult {
  const errors: string[] = []

  // Check return type
  if (typeof def.returns !== 'string') {
    errors.push(`Symbol '${symbol}': returns must be a string, got ${typeof def.returns}`)
  } else if (FORBIDDEN_TYPES.has(def.returns)) {
    errors.push(`Symbol '${symbol}': forbidden return type '${def.returns}'`)
  } else if (!validateType(def.returns)) {
    errors.push(`Symbol '${symbol}': unknown return type '${def.returns}'`)
  }

  // Check argument types
  if (!Array.isArray(def.args)) {
    errors.push(`Symbol '${symbol}': args must be an array, got ${typeof def.args}`)
  } else {
    for (let i = 0; i < def.args.length; i++) {
      const arg = def.args[i]
      if (typeof arg !== 'string') {
        errors.push(`Symbol '${symbol}': args[${i}] must be a string, got ${typeof arg}`)
      } else if (FORBIDDEN_TYPES.has(arg)) {
        errors.push(`Symbol '${symbol}': forbidden arg type at index ${i}: '${arg}'`)
      } else if (!validateType(arg)) {
        errors.push(`Symbol '${symbol}': unknown arg type at index ${i}: '${arg}'`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate all symbols in a dictionary
 * Throws XenonTypeError if any validation fails
 * @param symbols Symbol definitions
 * @throws XenonTypeError if validation fails
 */
export function validateSymbols(symbols: FFISymbols): void {
  const errors: string[] = []

  for (const [name, def] of Object.entries(symbols)) {
    const result = validateSymbolDef(name, def)
    if (!result.valid) {
      errors.push(...result.errors)
    }
  }

  if (errors.length > 0) {
    throw new XenonTypeError(`Symbol validation failed:\n${errors.join('\n')}`)
  }
}
