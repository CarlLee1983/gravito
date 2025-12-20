/**
 * Migration Repository
 * @description Tracks migration execution state in the database
 */

import { DB } from '../DB'
import { Schema } from '../schema'
import type { MigrationRecord } from './Migration'

/**
 * Migration Repository
 * Manages the migrations database table to track which migrations have been executed
 */
export class MigrationRepository {
    private tableName = 'migrations'
    private connectionName: string | undefined

    constructor(connectionName?: string) {
        this.connectionName = connectionName
    }

    /**
     * Set the table name for migrations
     */
    setTable(table: string): this {
        this.tableName = table
        return this
    }

    /**
     * Create the migration repository table if it doesn't exist
     */
    async createRepository(): Promise<void> {
        const exists = await this.repositoryExists()
        if (!exists) {
            await Schema.connection(this.connectionName ?? 'default').create(this.tableName, (table) => {
                table.id()
                table.string('migration')
                table.integer('batch')
            })
        }
    }

    /**
     * Check if the migration repository exists
     */
    async repositoryExists(): Promise<boolean> {
        return await Schema.connection(this.connectionName ?? 'default').hasTable(this.tableName)
    }

    /**
     * Delete the migration repository table
     */
    async deleteRepository(): Promise<void> {
        await Schema.connection(this.connectionName ?? 'default').dropIfExists(this.tableName)
    }

    /**
     * Get all ran migrations
     */
    async getRan(): Promise<string[]> {
        const records = await this.getConnection()
            .table<MigrationRecord>(this.tableName)
            .orderBy('batch')
            .orderBy('migration')
            .get()

        return records.map(r => r.migration)
    }

    /**
     * Get migrations for a specific batch
     */
    async getMigrations(batch: number): Promise<MigrationRecord[]> {
        return await this.getConnection()
            .table<MigrationRecord>(this.tableName)
            .where('batch', batch)
            .orderBy('migration', 'desc')
            .get()
    }

    /**
     * Get the last batch number
     */
    async getLastBatchNumber(): Promise<number> {
        const result = await this.getConnection()
            .table<MigrationRecord>(this.tableName)
            .max('batch')

        return typeof result === 'number' ? result : 0
    }

    /**
     * Get the next batch number
     */
    async getNextBatchNumber(): Promise<number> {
        return (await this.getLastBatchNumber()) + 1
    }

    /**
     * Log that a migration was run
     */
    async log(migration: string, batch: number): Promise<void> {
        await this.getConnection()
            .table(this.tableName)
            .insert({ migration, batch })
    }

    /**
     * Remove a migration from the log
     */
    async delete(migration: string): Promise<void> {
        await this.getConnection()
            .table(this.tableName)
            .where('migration', migration)
            .delete()
    }

    /**
     * Get the last migrations (for rollback)
     */
    async getLast(): Promise<MigrationRecord[]> {
        const lastBatch = await this.getLastBatchNumber()
        if (lastBatch === 0) return []

        return await this.getMigrations(lastBatch)
    }

    /**
     * Get the database connection
     */
    private getConnection() {
        return DB.connection(this.connectionName)
    }
}
