/**
 * Connection Manager
 * @description Manages multiple database connections
 */

import type { ConnectionConfig, ConnectionContract } from '../types'
import { Connection } from './Connection'

/**
 * Connection Manager
 * Handles multiple named database connections
 */
export class ConnectionManager {
    private connections: Map<string, ConnectionContract> = new Map()
    private defaultConnectionName = 'default'

    constructor(
        private readonly configs: Record<string, ConnectionConfig> = {}
    ) { }

    /**
     * Get a connection by name
     */
    connection(name?: string): ConnectionContract {
        const connectionName = name ?? this.defaultConnectionName

        // Return existing connection if available
        if (this.connections.has(connectionName)) {
            return this.connections.get(connectionName)!
        }

        // Create new connection
        const config = this.configs[connectionName]
        if (!config) {
            throw new Error(`Database connection "${connectionName}" is not configured`)
        }

        const connection = new Connection(connectionName, config)
        this.connections.set(connectionName, connection)

        return connection
    }

    /**
     * Add a connection configuration
     */
    addConnection(name: string, config: ConnectionConfig): void {
        this.configs[name] = config
    }

    /**
     * Set the default connection name
     */
    setDefaultConnection(name: string): void {
        this.defaultConnectionName = name
    }

    /**
     * Get the default connection name
     */
    getDefaultConnection(): string {
        return this.defaultConnectionName
    }

    /**
     * Check if a connection exists
     */
    hasConnection(name: string): boolean {
        return this.configs[name] !== undefined
    }

    /**
     * Get all connection names
     */
    getConnectionNames(): string[] {
        return Object.keys(this.configs)
    }

    /**
     * Get configuration for a connection
     */
    getConfig(name: string): ConnectionConfig | undefined {
        return this.configs[name]
    }

    /**
     * Disconnect all connections
     */
    async disconnectAll(): Promise<void> {
        const disconnectPromises: Promise<void>[] = []

        for (const connection of this.connections.values()) {
            disconnectPromises.push(connection.disconnect())
        }

        await Promise.all(disconnectPromises)
        this.connections.clear()
    }

    /**
     * Disconnect a specific connection
     */
    async disconnect(name?: string): Promise<void> {
        const connectionName = name ?? this.defaultConnectionName
        const connection = this.connections.get(connectionName)

        if (connection) {
            await connection.disconnect()
            this.connections.delete(connectionName)
        }
    }

    /**
     * Purge a connection (disconnect and remove from cache)
     */
    purge(name?: string): void {
        const connectionName = name ?? this.defaultConnectionName
        this.connections.delete(connectionName)
    }

    /**
     * Reconnect to a connection
     */
    async reconnect(name?: string): Promise<ConnectionContract> {
        await this.disconnect(name)
        return this.connection(name)
    }
}
