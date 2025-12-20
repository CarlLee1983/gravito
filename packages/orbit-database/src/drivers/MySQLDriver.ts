/**
 * MySQL/MariaDB Driver
 * @description Database driver for MySQL and MariaDB using mysql2 package
 */

import type {
    ConnectionConfig,
    DriverContract,
    DriverType,
    ExecuteResult,
    QueryResult,
} from '../types'

/**
 * MySQL Driver
 * Implements connection pooling and query execution for MySQL/MariaDB
 */
export class MySQLDriver implements DriverContract {
    private pool: MySQLPool | null = null
    private transactionConnection: MySQLConnection | null = null
    private connected = false
    private mysql: MySQLModule | null = null

    constructor(
        private readonly config: ConnectionConfig,
        private readonly driverType: 'mysql' | 'mariadb' = 'mysql'
    ) { }

    /**
     * Get the driver name
     */
    getDriverName(): DriverType {
        return this.driverType
    }

    /**
     * Connect to MySQL/MariaDB
     */
    async connect(): Promise<void> {
        if (this.connected) {
            return
        }

        this.mysql = await this.loadMySQLModule()

        const poolConfig: MySQLPoolConfig = {
            host: this.config.host ?? 'localhost',
            port: this.config.port ?? 3306,
            database: this.config.database,
            user: this.config.username,
            password: this.config.password,
            charset: this.config.charset ?? 'utf8mb4',
            timezone: this.config.timezone ?? 'local',
            connectionLimit: this.config.pool?.max ?? 10,
            waitForConnections: true,
            queueLimit: 0,
        }

        // SSL configuration
        if (this.config.ssl) {
            if (typeof this.config.ssl === 'boolean') {
                poolConfig.ssl = this.config.ssl ? {} : undefined
            } else {
                poolConfig.ssl = {
                    rejectUnauthorized: this.config.ssl.rejectUnauthorized,
                    ca: this.config.ssl.ca,
                    key: this.config.ssl.key,
                    cert: this.config.ssl.cert,
                }
            }
        }

        this.pool = this.mysql.createPool(poolConfig)
        this.connected = true
    }

    /**
     * Dynamically load mysql2 module
     */
    private async loadMySQLModule(): Promise<MySQLModule> {
        try {
            // @ts-ignore - mysql2 is an optional peer dependency
            const mysql2 = await import('mysql2/promise')
            return mysql2 as unknown as MySQLModule
        } catch {
            throw new Error(
                'MySQL driver requires the "mysql2" package. Please install it: bun add mysql2'
            )
        }
    }

    /**
     * Disconnect from MySQL
     */
    async disconnect(): Promise<void> {
        if (this.transactionConnection) {
            this.transactionConnection.release()
            this.transactionConnection = null
        }

        if (this.pool) {
            await this.pool.end()
            this.pool = null
        }

        this.connected = false
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.connected && this.pool !== null
    }

    /**
     * Execute a query
     */
    async query<T = Record<string, unknown>>(
        sql: string,
        bindings: unknown[] = []
    ): Promise<QueryResult<T>> {
        const connection = this.transactionConnection ?? (await this.getConnection())

        try {
            const [rows, fields] = await connection.execute(sql, bindings)

            const fieldInfo = fields?.map((f: MySQLFieldInfo) => ({
                name: f.name,
                dataType: f.type?.toString(),
                tableId: undefined,
            }))

            return {
                rows: rows as T[],
                rowCount: Array.isArray(rows) ? rows.length : 0,
                ...(fieldInfo ? { fields: fieldInfo } : {}),
            }
        } finally {
            if (!this.transactionConnection && connection) {
                connection.release()
            }
        }
    }

    /**
     * Execute a statement (INSERT/UPDATE/DELETE)
     */
    async execute(sql: string, bindings: unknown[] = []): Promise<ExecuteResult> {
        const connection = this.transactionConnection ?? (await this.getConnection())

        try {
            const [result] = await connection.execute(sql, bindings)
            const resultInfo = result as MySQLResultSetHeader

            return {
                affectedRows: resultInfo.affectedRows ?? 0,
                ...(resultInfo.insertId !== undefined && resultInfo.insertId !== 0
                    ? { insertId: resultInfo.insertId }
                    : {}),
                ...(resultInfo.changedRows !== undefined
                    ? { changedRows: resultInfo.changedRows }
                    : {}),
            }
        } finally {
            if (!this.transactionConnection && connection) {
                connection.release()
            }
        }
    }

    /**
     * Begin a transaction
     */
    async beginTransaction(): Promise<void> {
        if (this.transactionConnection) {
            throw new Error('Transaction already in progress')
        }

        this.transactionConnection = await this.getConnection()
        await this.transactionConnection.beginTransaction()
    }

    /**
     * Commit the current transaction
     */
    async commit(): Promise<void> {
        if (!this.transactionConnection) {
            throw new Error('No transaction in progress')
        }

        await this.transactionConnection.commit()
        this.transactionConnection.release()
        this.transactionConnection = null
    }

    /**
     * Rollback the current transaction
     */
    async rollback(): Promise<void> {
        if (!this.transactionConnection) {
            throw new Error('No transaction in progress')
        }

        await this.transactionConnection.rollback()
        this.transactionConnection.release()
        this.transactionConnection = null
    }

    /**
     * Check if in transaction
     */
    inTransaction(): boolean {
        return this.transactionConnection !== null
    }

    /**
     * Get a connection from the pool
     */
    private async getConnection(): Promise<MySQLConnection> {
        if (!this.pool) {
            throw new Error('Not connected to MySQL')
        }

        return await this.pool.getConnection()
    }
}

// ============================================================================
// Internal Types for mysql2 module
// ============================================================================

interface MySQLModule {
    createPool(config: MySQLPoolConfig): MySQLPool
}

interface MySQLPoolConfig {
    host?: string | undefined
    port?: number | undefined
    database?: string | undefined
    user?: string | undefined
    password?: string | undefined
    charset?: string | undefined
    timezone?: string | undefined
    connectionLimit?: number | undefined
    waitForConnections?: boolean | undefined
    queueLimit?: number | undefined
    ssl?: MySQLSSLConfig | undefined
}

interface MySQLSSLConfig {
    rejectUnauthorized?: boolean | undefined
    ca?: string | undefined
    key?: string | undefined
    cert?: string | undefined
}

interface MySQLPool {
    getConnection(): Promise<MySQLConnection>
    end(): Promise<void>
}

interface MySQLConnection {
    execute(sql: string, bindings?: unknown[]): Promise<[unknown, MySQLFieldInfo[] | undefined]>
    beginTransaction(): Promise<void>
    commit(): Promise<void>
    rollback(): Promise<void>
    release(): void
}

interface MySQLFieldInfo {
    name: string
    type?: number | undefined
}

interface MySQLResultSetHeader {
    affectedRows?: number | undefined
    insertId?: number | bigint | undefined
    changedRows?: number | undefined
}
