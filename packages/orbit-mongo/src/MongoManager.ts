/**
 * MongoDB Manager
 * @description Manages multiple MongoDB connections
 */

import type { MongoConfig, MongoManagerConfig, MongoClientContract } from './types'
import { MongoClient } from './MongoClient'

/**
 * MongoDB Manager
 * Manages multiple named MongoDB connections
 */
export class MongoManager {
    private connections = new Map<string, MongoClient>()
    private defaultConnection = 'default'
    private configs = new Map<string, MongoConfig>()

    /**
     * Configure the MongoDB manager
     */
    configure(config: MongoManagerConfig): void {
        this.defaultConnection = config.default ?? 'default'

        for (const [name, connectionConfig] of Object.entries(config.connections)) {
            this.configs.set(name, connectionConfig)
        }
    }

    /**
     * Add a connection configuration
     */
    addConnection(name: string, config: MongoConfig): void {
        this.configs.set(name, config)
    }

    /**
     * Get a connection by name
     */
    connection(name?: string): MongoClientContract {
        const connectionName = name ?? this.defaultConnection

        if (!this.connections.has(connectionName)) {
            const config = this.configs.get(connectionName)
            if (!config) {
                throw new Error(`MongoDB connection "${connectionName}" not configured`)
            }
            this.connections.set(connectionName, new MongoClient(config))
        }

        return this.connections.get(connectionName)!
    }

    /**
     * Get the default connection
     */
    getDefault(): MongoClientContract {
        return this.connection(this.defaultConnection)
    }

    /**
     * Connect all configured connections
     */
    async connectAll(): Promise<void> {
        for (const [name] of this.configs) {
            const client = this.connection(name)
            await client.connect()
        }
    }

    /**
     * Disconnect all connections
     */
    async disconnectAll(): Promise<void> {
        for (const client of this.connections.values()) {
            await client.disconnect()
        }
        this.connections.clear()
    }

    /**
     * Check if a connection exists
     */
    hasConnection(name: string): boolean {
        return this.configs.has(name)
    }

    /**
     * Remove a connection
     */
    async removeConnection(name: string): Promise<void> {
        const client = this.connections.get(name)
        if (client) {
            await client.disconnect()
            this.connections.delete(name)
        }
        this.configs.delete(name)
    }
}
