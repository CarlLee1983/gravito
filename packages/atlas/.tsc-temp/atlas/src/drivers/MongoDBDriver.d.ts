import type {
  ConnectionConfig,
  DriverContract,
  DriverType,
  ExecuteResult,
  QueryResult,
} from '../types'
/**
 * MongoDB Driver
 * Provides a document interface via DB.connection('mongodb')
 */
import type { MongoClient } from './types'
export declare class MongoDBDriver implements DriverContract {
  private config
  private client
  private db
  private MongoClientCtor?
  constructor(
    config: ConnectionConfig,
    deps?: {
      MongoClient?: new (url: string, options?: Record<string, unknown>) => MongoClient
    }
  )
  getDriverName(): DriverType
  connect(): Promise<void>
  /**
   * Dynamically load mongodb module
   */
  private loadMongoModule
  disconnect(): Promise<void>
  isConnected(): boolean
  /**
   * Execute a query (Protocol: JSON String)
   */
  query<T = Record<string, unknown>>(
    protocolJson: string,
    _bindings?: unknown[]
  ): Promise<QueryResult<T>>
  /**
   * Execute a write operation (Protocol: JSON String)
   */
  execute(protocolJson: string, _bindings?: unknown[]): Promise<ExecuteResult>
  beginTransaction(): Promise<void>
  commit(): Promise<void>
  rollback(): Promise<void>
  inTransaction(): boolean
  private mapDocument
}
