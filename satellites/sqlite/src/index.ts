/**
 * @gravito/satellite-sqlite
 * SQLite FFI binding via Xenon
 */

// Errors
export { SQLiteError, SQLiteConnectionError, SQLiteExecutionError } from './errors'

// Types
export type { SQLiteConnection, SQLiteConfig, SQLiteServiceConfig } from './types'

// Services
export { SQLiteService } from './services/SQLiteService'

// Satellite
export { SatelliteSQLite } from './SatelliteSQLite'
export type { SatelliteSQLiteConfig } from './SatelliteSQLite'
