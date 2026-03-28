/**
 * @fileoverview GraphQL error codes
 *
 * Namespaced error codes for the GraphQL module.
 *
 * @module @gravito/graphql/errors
 */

/**
 * Error codes for GraphQL module operations.
 * Follows dot-separated namespace convention.
 */
export const GraphqlErrorCodes = {
  UNSUPPORTED_RELATION: 'graphql.unsupported_relation',
  INVALID_CURSOR: 'graphql.invalid_cursor',
  INVALID_SCALAR: 'graphql.invalid_scalar',
  UNSUPPORTED_AST_NODE: 'graphql.unsupported_ast_node',
  NOT_FOUND: 'graphql.not_found',
  SCHEMA_ERROR: 'graphql.schema_error',
  RESOLVER_FAILED: 'graphql.resolver_failed',
} as const

export type GraphqlErrorCode = (typeof GraphqlErrorCodes)[keyof typeof GraphqlErrorCodes]
