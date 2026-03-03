/**
 * Type Casting Utilities
 * @description Helper functions for casting and validating attribute types
 */
import type { ColumnType } from '../schema/types'
/**
 * Get JavaScript type of value
 *
 * @param value - Value to check
 * @returns JavaScript type string
 */
export declare function getJSType(value: unknown): string
/**
 * Cast attribute value to its type
 *
 * @param key - Attribute key (unused, kept for future use)
 * @param value - Value to cast
 * @param type - Target type
 * @returns Casted value
 */
export declare function castAttribute(_key: string, value: unknown, type: string): unknown
/**
 * Get expected JavaScript types for column type
 *
 * @param columnType - Database column type
 * @returns Array of expected JavaScript types
 */
export declare function getExpectedJSTypes(columnType: ColumnType): string[]
