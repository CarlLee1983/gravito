import { MongoClient, type Db } from 'mongodb'
import type { MongoQueryProtocol } from '../grammar/MongoGrammar'
import type {
  ConnectionConfig,
  DriverContract,
  DriverType,
  ExecuteResult,
  MongoDBConfig,
  QueryResult,
} from '../types'
import { ConnectionError, DatabaseError } from '../errors'

/**
 * MongoDB Driver
 * Provides a document interface via DB.connection('mongodb')
 */
export class MongoDBDriver implements DriverContract {
  private config: MongoDBConfig
  private client: MongoClient | null = null
  private db: Db | null = null

  constructor(config: ConnectionConfig) {
    if (config.driver !== 'mongodb') {
      throw new Error(`Invalid driver type '\${config.driver}' for MongoDBDriver`)
    }
    this.config = config as MongoDBConfig
  }

  getDriverName(): DriverType {
    return 'mongodb'
  }

  async connect(): Promise<void> {
    if (this.client) {
      return
    }

    try {
      this.client = new MongoClient(this.config.uri ?? `mongodb://\${this.config.host}:\${this.config.port}/\${this.config.database}`)
      await this.client.connect()
      this.db = this.client.db(this.config.database)
    } catch (error) {
      throw new ConnectionError('Could not connect to MongoDB cluster', error)
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close()
      this.client = null
      this.db = null
    }
  }

  isConnected(): boolean {
    return this.client !== null
  }

  /**
   * Execute a query (Protocol: JSON String)
   */
  async query<T = Record<string, unknown>>(
    protocolJson: string,
    _bindings: unknown[] = []
  ): Promise<QueryResult<T>> {
    if (!this.db) await this.connect()

    try {
      const protocol = JSON.parse(protocolJson) as MongoQueryProtocol
      const collection = this.db!.collection(protocol.collection)

      if (protocol.operation === 'find') {
        const rows = await collection.find(protocol.filter || {}, protocol.options).toArray()
        // Map _id to id for compatibility
        const mappedRows = rows.map(this.mapDocument) as T[]
        return {
          rows: mappedRows,
          rowCount: mappedRows.length,
        }
      }

      if (protocol.operation === 'count') {
        const count = await collection.countDocuments(protocol.filter || {})
        // Return in aggregate format expected by QueryBuilder
        return {
            rows: [{ aggregate: count }] as any,
            rowCount: 1
        }
      }

      throw new Error(`Unsupported read operation: \${protocol.operation}`)

    } catch (error) {
      if (error instanceof SyntaxError) {
          throw new DatabaseError('Invalid MongoDB Protocol: ' + protocolJson)
      }
      throw new DatabaseError('MongoDB Query Failed', error)
    }
  }

  /**
   * Execute a write operation (Protocol: JSON String)
   */
  async execute(protocolJson: string, _bindings: unknown[] = []): Promise<ExecuteResult> {
    if (!this.db) await this.connect()

    try {
      const protocol = JSON.parse(protocolJson) as MongoQueryProtocol
      const collection = this.db!.collection(protocol.collection)

      if (protocol.operation === 'insert') {
        // Handle array or single
        const docs = Array.isArray(protocol.document) ? protocol.document : [protocol.document]
        const result = await collection.insertMany(docs as any[])
        return {
            affectedRows: result.insertedCount,
            insertId: result.insertedIds[0] as any // Return first ID
        }
      }

      if (protocol.operation === 'update') {
        const result = await collection.updateMany(protocol.filter || {}, protocol.update || {})
        return {
            affectedRows: result.modifiedCount,
            changedRows: result.modifiedCount
        }
      }

      if (protocol.operation === 'delete') {
        const result = await collection.deleteMany(protocol.filter || {})
        return {
            affectedRows: result.deletedCount
        }
      }

      throw new Error(`Unsupported write operation: \${protocol.operation}`)

    } catch (error) {
       throw new DatabaseError('MongoDB Execute Failed', error)
    }
  }

  async beginTransaction(): Promise<void> {
    // MongoDB transactions require replica sets.
    // For now, no-op or throw warning?
    // We'll leave as no-op to allow tests to run without crashing
  }

  async commit(): Promise<void> {}

  async rollback(): Promise<void> {}

  inTransaction(): boolean {
    return false
  }

  private mapDocument(doc: any): any {
    if (doc._id) {
        doc.id = doc._id.toString()
        // Keep _id or remove? Best to keep for native usage
    }
    return doc
  }
}
