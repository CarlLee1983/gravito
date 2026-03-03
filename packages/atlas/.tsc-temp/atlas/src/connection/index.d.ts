/**
 * Connection Module
 * @description Provides connection management and database connection implementations.
 *
 * The connection module is responsible for:
 * 1. Managing multiple named connections (ConnectionManager)
 * 2. Providing a unified interface for different database drivers (Connection)
 * 3. Handling the connection lifecycle (connect, disconnect, idle cleanup)
 */
export { Connection } from './Connection'
export { ConnectionManager } from './ConnectionManager'
