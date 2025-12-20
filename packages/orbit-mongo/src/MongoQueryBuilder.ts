/**
 * MongoDB Query Builder
 * @description Fluent query builder for MongoDB collections
 */

import type {
    MongoCollectionContract,
    MongoAggregateContract,
    FilterOperator,
    SortDirection,
    FilterDocument,
    UpdateDocument,
    InsertResult,
    InsertManyResult,
    UpdateResult,
    DeleteResult,
    Document,
} from './types'

/**
 * MongoDB Query Builder
 * Provides a fluent interface for MongoDB queries
 */
export class MongoQueryBuilder<T = Document> implements MongoCollectionContract<T> {
    private filters: FilterDocument = {}
    private orFilters: FilterDocument[] = []
    private projection: Record<string, 0 | 1> = {}
    private sortSpec: Record<string, 1 | -1> = {}
    private limitCount: number | undefined
    private skipCount: number | undefined

    constructor(
        private readonly nativeCollection: MongoNativeCollection,
        private readonly collectionName: string
    ) { }

    // ============================================================================
    // WHERE Clauses
    // ============================================================================

    where(field: string, operatorOrValue: FilterOperator | unknown, value?: unknown): this {
        if (value === undefined) {
            // Simple equality: where('name', 'John')
            this.filters[field] = operatorOrValue
        } else {
            // With operator: where('age', '>', 18)
            const operator = operatorOrValue as FilterOperator
            this.filters[field] = this.mapOperator(operator, value)
        }
        return this
    }

    orWhere(field: string, operatorOrValue: FilterOperator | unknown, value?: unknown): this {
        const filter: FilterDocument = {}
        if (value === undefined) {
            filter[field] = operatorOrValue
        } else {
            const operator = operatorOrValue as FilterOperator
            filter[field] = this.mapOperator(operator, value)
        }
        this.orFilters.push(filter)
        return this
    }

    whereIn(field: string, values: unknown[]): this {
        this.filters[field] = { $in: values }
        return this
    }

    whereNotIn(field: string, values: unknown[]): this {
        this.filters[field] = { $nin: values }
        return this
    }

    whereNull(field: string): this {
        this.filters[field] = null
        return this
    }

    whereNotNull(field: string): this {
        this.filters[field] = { $ne: null }
        return this
    }

    whereExists(field: string, exists = true): this {
        this.filters[field] = { $exists: exists }
        return this
    }

    whereRegex(field: string, pattern: string | RegExp): this {
        this.filters[field] = { $regex: pattern }
        return this
    }

    // ============================================================================
    // Projection
    // ============================================================================

    select(...fields: string[]): this {
        for (const field of fields) {
            this.projection[field] = 1
        }
        return this
    }

    exclude(...fields: string[]): this {
        for (const field of fields) {
            this.projection[field] = 0
        }
        return this
    }

    // ============================================================================
    // Sorting
    // ============================================================================

    orderBy(field: string, direction: SortDirection = 'asc'): this {
        this.sortSpec[field] = direction === 'asc' || direction === 1 ? 1 : -1
        return this
    }

    latest(field = 'createdAt'): this {
        return this.orderBy(field, 'desc')
    }

    oldest(field = 'createdAt'): this {
        return this.orderBy(field, 'asc')
    }

    // ============================================================================
    // Pagination
    // ============================================================================

    limit(count: number): this {
        this.limitCount = count
        return this
    }

    skip(count: number): this {
        this.skipCount = count
        return this
    }

    offset(count: number): this {
        return this.skip(count)
    }

    // ============================================================================
    // Read Operations
    // ============================================================================

    async get(): Promise<T[]> {
        const cursor = this.nativeCollection.find(this.toFilter(), {
            projection: Object.keys(this.projection).length > 0 ? this.projection : undefined,
            sort: Object.keys(this.sortSpec).length > 0 ? this.sortSpec : undefined,
            limit: this.limitCount,
            skip: this.skipCount,
        })
        return await cursor.toArray() as T[]
    }

    async first(): Promise<T | null> {
        const result = await this.nativeCollection.findOne(this.toFilter(), {
            projection: Object.keys(this.projection).length > 0 ? this.projection : undefined,
            sort: Object.keys(this.sortSpec).length > 0 ? this.sortSpec : undefined,
        })
        return result as T | null
    }

    async find(id: string): Promise<T | null> {
        const { ObjectId } = await this.loadObjectId()
        const result = await this.nativeCollection.findOne(
            { _id: new ObjectId(id) },
            { projection: Object.keys(this.projection).length > 0 ? this.projection : undefined }
        )
        return result as T | null
    }

    async count(): Promise<number> {
        return await this.nativeCollection.countDocuments(this.toFilter())
    }

    async exists(): Promise<boolean> {
        const count = await this.nativeCollection.countDocuments(this.toFilter(), { limit: 1 })
        return count > 0
    }

    async distinct(field: string): Promise<unknown[]> {
        return await this.nativeCollection.distinct(field, this.toFilter())
    }

    // ============================================================================
    // Write Operations
    // ============================================================================

    async insert(document: Partial<T>): Promise<InsertResult> {
        const result = await this.nativeCollection.insertOne(document as MongoDocument)
        return {
            insertedId: result.insertedId.toString(),
            acknowledged: result.acknowledged,
        }
    }

    async insertMany(documents: Partial<T>[]): Promise<InsertManyResult> {
        const result = await this.nativeCollection.insertMany(documents as MongoDocument[])
        return {
            insertedIds: Object.values(result.insertedIds).map(id => id.toString()),
            insertedCount: result.insertedCount,
            acknowledged: result.acknowledged,
        }
    }

    async update(update: UpdateDocument): Promise<UpdateResult> {
        const updateDoc = this.normalizeUpdate(update)
        const result = await this.nativeCollection.updateOne(this.toFilter(), updateDoc)
        return {
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount,
            acknowledged: result.acknowledged,
            ...(result.upsertedId ? { upsertedId: result.upsertedId.toString() } : {}),
        }
    }

    async updateMany(update: UpdateDocument): Promise<UpdateResult> {
        const updateDoc = this.normalizeUpdate(update)
        const result = await this.nativeCollection.updateMany(this.toFilter(), updateDoc)
        return {
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount,
            acknowledged: result.acknowledged,
            ...(result.upsertedId ? { upsertedId: result.upsertedId.toString() } : {}),
        }
    }

    async delete(): Promise<DeleteResult> {
        const result = await this.nativeCollection.deleteOne(this.toFilter())
        return {
            deletedCount: result.deletedCount,
            acknowledged: result.acknowledged,
        }
    }

    async deleteMany(): Promise<DeleteResult> {
        const result = await this.nativeCollection.deleteMany(this.toFilter())
        return {
            deletedCount: result.deletedCount,
            acknowledged: result.acknowledged,
        }
    }

    // ============================================================================
    // Aggregation
    // ============================================================================

    aggregate(): MongoAggregateContract<T> {
        return new MongoAggregateBuilder<T>(this.nativeCollection, this.toFilter())
    }

    // ============================================================================
    // Utilities
    // ============================================================================

    toFilter(): FilterDocument {
        if (this.orFilters.length === 0) {
            return { ...this.filters }
        }

        return {
            $or: [this.filters, ...this.orFilters],
        }
    }

    clone(): MongoCollectionContract<T> {
        const cloned = new MongoQueryBuilder<T>(this.nativeCollection, this.collectionName)
        cloned.filters = { ...this.filters }
        cloned.orFilters = [...this.orFilters]
        cloned.projection = { ...this.projection }
        cloned.sortSpec = { ...this.sortSpec }
        cloned.limitCount = this.limitCount
        cloned.skipCount = this.skipCount
        return cloned
    }

    // ============================================================================
    // Private Helpers
    // ============================================================================

    private mapOperator(operator: FilterOperator, value: unknown): unknown {
        switch (operator) {
            case '=':
                return value
            case '!=':
                return { $ne: value }
            case '>':
                return { $gt: value }
            case '>=':
                return { $gte: value }
            case '<':
                return { $lt: value }
            case '<=':
                return { $lte: value }
            case 'in':
                return { $in: value }
            case 'nin':
                return { $nin: value }
            case 'exists':
                return { $exists: value }
            case 'regex':
                return { $regex: value }
            default:
                return value
        }
    }

    private normalizeUpdate(update: UpdateDocument): UpdateDocument {
        // If update doesn't have MongoDB operators, wrap in $set
        const hasOperator = Object.keys(update).some(key => key.startsWith('$'))
        if (hasOperator) {
            return update
        }
        return { $set: update }
    }

    private async loadObjectId(): Promise<{ ObjectId: MongoObjectIdConstructor }> {
        // @ts-ignore - mongodb is optional peer dependency
        const mongodb = await import('mongodb')
        return mongodb
    }
}

/**
 * MongoDB Aggregation Builder
 */
export class MongoAggregateBuilder<T = Document> implements MongoAggregateContract<T> {
    private pipeline: Record<string, unknown>[] = []

    constructor(
        private readonly nativeCollection: MongoNativeCollection,
        initialFilter?: FilterDocument
    ) {
        if (initialFilter && Object.keys(initialFilter).length > 0) {
            this.pipeline.push({ $match: initialFilter })
        }
    }

    match(filter: FilterDocument): this {
        this.pipeline.push({ $match: filter })
        return this
    }

    group(spec: Record<string, unknown>): this {
        this.pipeline.push({ $group: spec })
        return this
    }

    project(projection: Record<string, unknown>): this {
        this.pipeline.push({ $project: projection })
        return this
    }

    sort(spec: Record<string, SortDirection>): this {
        const normalizedSpec: Record<string, 1 | -1> = {}
        for (const [key, value] of Object.entries(spec)) {
            normalizedSpec[key] = value === 'asc' || value === 1 ? 1 : -1
        }
        this.pipeline.push({ $sort: normalizedSpec })
        return this
    }

    limit(count: number): this {
        this.pipeline.push({ $limit: count })
        return this
    }

    skip(count: number): this {
        this.pipeline.push({ $skip: count })
        return this
    }

    unwind(field: string | { path: string; preserveNullAndEmptyArrays?: boolean }): this {
        this.pipeline.push({ $unwind: field })
        return this
    }

    lookup(options: { from: string; localField: string; foreignField: string; as: string }): this {
        this.pipeline.push({ $lookup: options })
        return this
    }

    addFields(fields: Record<string, unknown>): this {
        this.pipeline.push({ $addFields: fields })
        return this
    }

    count(fieldName: string): this {
        this.pipeline.push({ $count: fieldName })
        return this
    }

    async get(): Promise<T[]> {
        const cursor = this.nativeCollection.aggregate(this.pipeline)
        return await cursor.toArray() as T[]
    }

    async first(): Promise<T | null> {
        this.pipeline.push({ $limit: 1 })
        const results = await this.get()
        return results[0] ?? null
    }

    toPipeline(): Record<string, unknown>[] {
        return [...this.pipeline]
    }
}

// ============================================================================
// Internal Types for mongodb module
// ============================================================================

// biome-ignore lint/suspicious/noExplicitAny: MongoDB native types are complex
export interface MongoNativeCollection extends Record<string, any> {
    find(filter: FilterDocument, options?: Record<string, unknown>): MongoCursor
    findOne(filter: FilterDocument, options?: Record<string, unknown>): Promise<unknown>
    insertOne(doc: MongoDocument): Promise<{ insertedId: MongoObjectId; acknowledged: boolean }>
    insertMany(docs: MongoDocument[]): Promise<{ insertedIds: Record<number, MongoObjectId>; insertedCount: number; acknowledged: boolean }>
    updateOne(filter: FilterDocument, update: UpdateDocument): Promise<MongoUpdateResult>
    updateMany(filter: FilterDocument, update: UpdateDocument): Promise<MongoUpdateResult>
    deleteOne(filter: FilterDocument): Promise<{ deletedCount: number; acknowledged: boolean }>
    deleteMany(filter: FilterDocument): Promise<{ deletedCount: number; acknowledged: boolean }>
    countDocuments(filter: FilterDocument, options?: Record<string, unknown>): Promise<number>
    distinct(field: string, filter: FilterDocument): Promise<unknown[]>
    aggregate(pipeline: Record<string, unknown>[]): MongoCursor
}

interface MongoCursor {
    toArray(): Promise<unknown[]>
}

interface MongoObjectId {
    toString(): string
}

interface MongoObjectIdConstructor {
    new(id: string): MongoObjectId
}

interface MongoDocument {
    [key: string]: unknown
}

interface MongoUpdateResult {
    matchedCount: number
    modifiedCount: number
    acknowledged: boolean
    upsertedId?: MongoObjectId
}
