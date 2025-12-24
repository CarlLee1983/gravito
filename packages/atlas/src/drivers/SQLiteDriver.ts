/**
 * SQLite Driver
 * @description Database driver implementation for SQLite using better-sqlite3
 */

import {

  ConnectionError,

  DatabaseError,

  ForeignKeyConstraintError,

  NotNullConstraintError,

  TableNotFoundError,

  UniqueConstraintError,

} from '../errors'

import { SQLiteGrammar } from '../grammar/SQLiteGrammar'

import type {

  ConnectionConfig,

  DriverContract,

  DriverType,

  ExecuteResult,

  QueryResult,

  SQLiteConfig,

} from '../types'



declare const Bun: any



/**

 * SQLite Driver

 */

export class SQLiteDriver implements DriverContract {

  private config: SQLiteConfig

  private client: any | null = null

  private grammar = new SQLiteGrammar()

  private inTransactionState = false



  constructor(config: ConnectionConfig) {

    if (config.driver !== 'sqlite') {

      throw new Error(`Invalid driver type '${config.driver}' for SQLiteDriver`)

    }

    this.config = config as SQLiteConfig

  }



  getDriverName(): DriverType {

    return 'sqlite'

  }



  async connect(): Promise<void> {

    if (this.client) {

      return

    }



    try {

      if (typeof Bun !== 'undefined') {

        const { Database } = await import('bun:sqlite')

        this.client = new Database(this.config.database, {

          readonly: this.config.readonly ?? false,

          create: true,

        })

        this.client.exec('PRAGMA journal_mode = WAL;')

      } else {

        const { default: Database } = await import('better-sqlite3')

        this.client = new Database(this.config.database, {

          readonly: this.config.readonly ?? false,

        })

        this.client.pragma('journal_mode = WAL')

      }

    } catch (error) {

      throw new ConnectionError('Could not connect to SQLite database', error)

    }

  }



  async disconnect(): Promise<void> {

    if (this.client) {

      this.client.close()

      this.client = null

    }

  }



  isConnected(): boolean {

    return this.client !== null && this.client.open

  }



  async query<T = Record<string, unknown>>(

    sql: string,

    bindings: unknown[] = []

  ): Promise<QueryResult<T>> {

    if (!this.client) {

      await this.connect()

    }



        const params = bindings.map((b) => {



          if (b === undefined) return null



          if (b instanceof Date) return b.toISOString()



    

      if (typeof b === 'boolean') return b ? 1 : 0

      if (typeof b === 'object' && b !== null && !Array.isArray(b) && !ArrayBuffer.isView(b)) {

        return JSON.stringify(b)

      }

      return b

    })



    try {

      const stmt = this.client!.prepare(sql)

      const rows = stmt.all(...params) as T[]



      // For SQLite, better-sqlite3 returns column details in stmt.columns() after execution

      // but only if it's a select? 'all' executes it.

      // We can iterate columns if needed, but QueryResult usually just needs rows.



      return {

        rows,

        rowCount: rows.length,

      }

    } catch (error: any) {

      throw this.normalizeError(error, sql, bindings)

    }

  }



  async execute(sql: string, bindings: unknown[] = []): Promise<ExecuteResult> {

    if (!this.client) {

      await this.connect()

    }



    const params = bindings.map((b) => {

      if (b instanceof Date) return b.toISOString()

      if (typeof b === 'boolean') return b ? 1 : 0

      if (typeof b === 'object' && b !== null && !Array.isArray(b) && !ArrayBuffer.isView(b)) {

        return JSON.stringify(b)

      }

      return b

    })



    try {

      const stmt = this.client!.prepare(sql)

      const result = stmt.run(...params)



      return {

        affectedRows: result.changes,

        insertId: result.lastInsertRowid,

        changedRows: result.changes,

      }

    } catch (error: any) {

      throw this.normalizeError(error, sql, bindings)

    }

  }



  async beginTransaction(): Promise<void> {

    if (!this.client) await this.connect()

    this.client!.prepare('BEGIN').run()

    this.inTransactionState = true

  }



  async commit(): Promise<void> {

    if (!this.client) return

    this.client!.prepare('COMMIT').run()

    this.inTransactionState = false

  }



  async rollback(): Promise<void> {

    if (!this.client) return

    this.client!.prepare('ROLLBACK').run()

    this.inTransactionState = false

  }



  inTransaction(): boolean {

    return this.inTransactionState || (this.client?.inTransaction ?? false)

  }



    /**



     * Normalize SQLite errors



     */



    private normalizeError(error: any, sql: string, bindings: unknown[]): DatabaseError {



      const message = error.message.toLowerCase()



  



      if (message.includes('unique constraint failed') || message.includes('is not unique')) {



        return new UniqueConstraintError(error.message, error, sql, bindings)



      }



      if (message.includes('foreign key constraint failed')) {



        return new ForeignKeyConstraintError(error.message, error, sql, bindings)



      }



      if (message.includes('not null constraint failed')) {



        return new NotNullConstraintError(error.message, error, sql, bindings)



      }



      if (message.includes('no such table')) {



        return new TableNotFoundError(error.message, error, sql, bindings)



      }



  



      return new DatabaseError(error.message, error, sql, bindings)



    }



  

}


