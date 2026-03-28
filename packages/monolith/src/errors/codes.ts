/**
 * @fileoverview Monolith error codes
 *
 * Namespaced error codes for the Monolith CMS module.
 *
 * @module @gravito/monolith/errors
 */

/**
 * Error codes for Monolith module operations.
 * Follows dot-separated namespace convention.
 */
export const MonolithErrorCodes = {
  FILE_NOT_FOUND: 'monolith.file_not_found',
  NOT_A_FILE: 'monolith.not_a_file',
  METHOD_NOT_FOUND: 'monolith.method_not_found',
  COLLECTION_NOT_DEFINED: 'monolith.collection_not_defined',
  CONFIG_ERROR: 'monolith.config_error',
} as const

export type MonolithErrorCode = (typeof MonolithErrorCodes)[keyof typeof MonolithErrorCodes]
