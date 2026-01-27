/**
 * MongoDB Query Builder
 * @description Fluent query builder for MongoDB collections
 */

import type {
  BulkWriteOperation,
  BulkWriteResult,
  ChangeEvent,
  ChangeStreamOptions,
  DeleteResult,
  FilterDocument,
  FilterOperator,
  InsertManyResult,
  InsertResult,
  MongoAggregateContract,
  MongoCollectionContract,
  PipelineStage,
  SortDirection,
  UpdateDocument,
  UpdateResult,
} from './types'

/**
 * MongoDB Query Builder
 *
 * Provides a Laravel-style Fluent API for MongoDB query operations.
 * Supports chaining, condition filtering, sorting, pagination, etc.
 *
 * @typeParam T - Document type, defaults to generic Document
 *
 * @example Basic Query
 * ```typescript
 * const users = await Mongo.collection<User>('users')
 *   .where('status', 'active')
 *   .orderBy('createdAt', 'desc')
 *   .limit(10)
 *   .get()
 * ```
 *
 * @example Composite Conditions
 * ```typescript
 * const results = await Mongo.collection('orders')
 *   .where('status', 'pending')
 *   .where('amount', '>', 100)
 *   .whereIn('category', ['electronics', 'clothing'])
 *   .get()
 * ```
 *
 * @public
 * @since 1.0.0
 */
export class MongoQueryBuilder<T = Document> implements MongoCollectionContract<T> {
  private static ObjectIdCtor: MongoObjectIdConstructor | null = null
  private filters: FilterDocument = {}
  private orFilters: FilterDocument[] = []
  private projection: Record<string, 0 | 1> = {}
  private sortSpec: Record<string, 1 | -1> = {}
  private limitCount: number | undefined
  private skipCount: number | undefined

  constructor(
    private readonly nativeCollection: MongoNativeCollection,
    private readonly collectionName: string,
    private readonly session?: unknown
  ) {}

  // ============================================================================
  // WHERE Clauses
  // ============================================================================

  /**
   * Adds a basic WHERE clause to the query.
   *
   * Filters documents where the field matches the given value or satisfies the operator condition.
   *
   * @param field - The name of the field to filter by.
   * @param operatorOrValue - The comparison operator (e.g., '>', '!=') or value for direct equality.
   * @param value - The comparison value if an operator is provided.
   * @returns The current builder instance for method chaining.
   *
   * @example Equality check
   * ```typescript
   * query.where('status', 'active');
   * ```
   *
   * @example Operator check
   * ```typescript
   * query.where('age', '>=', 18);
   * ```
   *
   * @example Complex value check
   * ```typescript
   * query.where('metadata.loginCount', '>', 5);
   * ```
   */
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

  /**
   * Adds an OR WHERE clause to the query.
   *
   * Creates a logical OR condition. If combined with standard `where` clauses,
   * it functions as `(where AND ...) OR (orWhere)`.
   *
   * @param field - The field to filter on.
   * @param operatorOrValue - The operator or value.
   * @param value - The value if an operator was provided.
   * @returns The current builder instance for method chaining.
   *
   * @example Simple OR condition
   * ```typescript
   * // Matches where status is 'active' OR 'pending'
   * query.where('status', 'active').orWhere('status', 'pending');
   * ```
   *
   * @example Mixed AND/OR logic
   * ```typescript
   * // Matches (role='admin') OR (role='editor' AND active=true)
   * // Note: Logic depends on filter structure, verify with toFilter()
   * query.where('role', 'admin').orWhere('role', 'editor');
   * ```
   */
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

  /**
   * Adds a WHERE IN clause.
   *
   * Filters documents where the field value exists in the provided array.
   *
   * @param field - The field to filter on.
   * @param values - Array of possible values.
   * @returns The current builder instance for method chaining.
   *
   * @example
   * ```typescript
   * query.whereIn('role', ['admin', 'moderator', 'editor']);
   * ```
   */
  whereIn(field: string, values: unknown[]): this {
    this.filters[field] = { $in: values }
    return this
  }

  /**
   * Adds a WHERE NOT IN clause.
   *
   * Filters documents where the field value is NOT present in the provided array.
   *
   * @param field - The field to filter on.
   * @param values - Array of values to exclude.
   * @returns The current builder instance for method chaining.
   *
   * @example
   * ```typescript
   * query.whereNotIn('status', ['deleted', 'banned']);
   * ```
   */
  whereNotIn(field: string, values: unknown[]): this {
    this.filters[field] = { $nin: values }
    return this
  }

  /**
   * Adds a WHERE NULL clause.
   *
   * Filters documents where the field is null or missing.
   *
   * @param field - The field to check.
   * @returns The current builder instance for method chaining.
   *
   * @example
   * ```typescript
   * query.whereNull('deletedAt');
   * ```
   */
  whereNull(field: string): this {
    this.filters[field] = null
    return this
  }

  /**
   * Adds a WHERE NOT NULL clause.
   *
   * Filters documents where the field is present and not null.
   *
   * @param field - The field to check.
   * @returns The current builder instance for method chaining.
   *
   * @example
   * ```typescript
   * query.whereNotNull('publishedAt');
   * ```
   */
  whereNotNull(field: string): this {
    this.filters[field] = { $ne: null }
    return this
  }

  /**
   * Adds a WHERE EXISTS clause.
   *
   * Filters documents based on the existence of a field.
   *
   * @param field - The field to check.
   * @param exists - True to check existence, false to check non-existence.
   * @returns The current builder instance for method chaining.
   *
   * @example Check if field exists
   * ```typescript
   * query.whereExists('metadata');
   * ```
   *
   * @example Check if field is missing
   * ```typescript
   * query.whereExists('deletedAt', false);
   * ```
   */
  whereExists(field: string, exists = true): this {
    this.filters[field] = { $exists: exists }
    return this
  }

  /**
   * Adds a WHERE REGEX clause.
   *
   * Filters documents using a regular expression.
   * Note: Regex queries can be expensive on large datasets without indexes.
   *
   * @param field - The field to match.
   * @param pattern - The regex pattern string or RegExp object.
   * @returns The current builder instance for method chaining.
   *
   * @example Case-insensitive search
   * ```typescript
   * query.whereRegex('email', /@gmail\.com$/i);
   * ```
   *
   * @example String pattern
   * ```typescript
   * query.whereRegex('sku', '^PROD-');
   * ```
   */
  whereRegex(field: string, pattern: string | RegExp): this {
    this.filters[field] = { $regex: pattern }
    return this
  }

  // ============================================================================
  // Projection
  // ============================================================================

  /**
   * Specifies fields to include in the result (Projection).
   *
   * Only the specified fields (and _id) will be returned.
   *
   * @param fields - Names of fields to include.
   * @returns The current builder instance for method chaining.
   *
   * @example
   * ```typescript
   * query.select('name', 'email', 'avatar');
   * ```
   */
  select(...fields: string[]): this {
    for (const field of fields) {
      this.projection[field] = 1
    }
    return this
  }

  /**
   * Specifies fields to exclude from the result (Projection).
   *
   * The specified fields will be omitted from the returned documents.
   *
   * @param fields - Names of fields to exclude.
   * @returns The current builder instance for method chaining.
   *
   * @example
   * ```typescript
   * query.exclude('password', 'secretToken');
   * ```
   */
  exclude(...fields: string[]): this {
    for (const field of fields) {
      this.projection[field] = 0
    }
    return this
  }

  // ============================================================================
  // Sorting
  // ============================================================================

  /**
   * Sorts the results by a specific field.
   *
   * @param field - The field name to sort by.
   * @param direction - Sort direction ('asc' for ascending, 'desc' for descending).
   * @returns The current builder instance for method chaining.
   *
   * @example Ascending sort
   * ```typescript
   * query.orderBy('name', 'asc');
   * ```
   *
   * @example Descending sort
   * ```typescript
   * query.orderBy('score', 'desc');
   * ```
   */
  orderBy(field: string, direction: SortDirection = 'asc'): this {
    this.sortSpec[field] = direction === 'asc' || direction === 1 ? 1 : -1
    return this
  }

  /**
   * Sorts results by date in descending order (newest first).
   *
   * @param field - The date field to sort by (defaults to 'createdAt').
   * @returns The current builder instance for method chaining.
   *
   * @example
   * ```typescript
   * query.latest(); // Sorts by 'createdAt' desc
   * ```
   */
  latest(field = 'createdAt'): this {
    return this.orderBy(field, 'desc')
  }

  /**
   * Sorts results by date in ascending order (oldest first).
   *
   * @param field - The date field to sort by (defaults to 'createdAt').
   * @returns The current builder instance for method chaining.
   *
   * @example
   * ```typescript
   * query.oldest(); // Sorts by 'createdAt' asc
   * ```
   */
  oldest(field = 'createdAt'): this {
    return this.orderBy(field, 'asc')
  }

  // ============================================================================
  // Pagination
  // ============================================================================

  /**
   * Limits the maximum number of documents returned.
   *
   * @param count - The maximum number of documents.
   * @returns The current builder instance for method chaining.
   *
   * @example
   * ```typescript
   * query.limit(10);
   * ```
   */
  limit(count: number): this {
    this.limitCount = count
    return this
  }

  /**
   * Skips the specified number of documents.
   *
   * Useful for pagination.
   *
   * @param count - The number of documents to skip.
   * @returns The current builder instance for method chaining.
   *
   * @example
   * ```typescript
   * query.skip(20);
   * ```
   */
  skip(count: number): this {
    this.skipCount = count
    return this
  }

  /**
   * Alias for {@link skip}.
   *
   * @param count - The number of documents to skip.
   * @returns The current builder instance for method chaining.
   */
  offset(count: number): this {
    return this.skip(count)
  }

  // ============================================================================
  // Read Operations
  // ============================================================================

  /**
   * Executes the query and returns all matching documents.
   *
   * @returns Promise resolving to an array of documents.
   * @throws {Error} If the database connection fails.
   *
   * @example
   * ```typescript
   * const users = await query.where('active', true).get();
   * ```
   */
  async get(): Promise<T[]> {
    const cursor = this.nativeCollection.find(this.toFilter(), {
      projection: Object.keys(this.projection).length > 0 ? this.projection : undefined,
      sort: Object.keys(this.sortSpec).length > 0 ? this.sortSpec : undefined,
      limit: this.limitCount,
      skip: this.skipCount,
      session: this.session,
    })
    return (await cursor.toArray()) as T[]
  }

  /**
   * Executes the query and returns the first matching document.
   *
   * @returns Promise resolving to the document or null if no match found.
   * @throws {Error} If the database connection fails.
   *
   * @example
   * ```typescript
   * const user = await query.where('email', 'test@example.com').first();
   * if (user) {
   *   console.log('User found:', user);
   * }
   * ```
   */
  async first(): Promise<T | null> {
    const result = await this.nativeCollection.findOne(this.toFilter(), {
      projection: Object.keys(this.projection).length > 0 ? this.projection : undefined,
      sort: Object.keys(this.sortSpec).length > 0 ? this.sortSpec : undefined,
      session: this.session,
    })
    return result as T | null
  }

  /**
   * Finds a document by its unique _id.
   *
   * Automatically converts the string ID to a MongoDB ObjectId.
   *
   * @param id - The hexadecimal string representation of the ObjectId.
   * @returns Promise resolving to the document or null if not found.
   * @throws {Error} If the provided ID is not a valid 24-character hex string.
   *
   * @example
   * ```typescript
   * const post = await query.find('507f1f77bcf86cd799439011');
   * ```
   */
  async find(id: string): Promise<T | null> {
    const ObjectId = await this.getObjectId()
    const result = await this.nativeCollection.findOne(
      { _id: new ObjectId(id) },
      {
        projection: Object.keys(this.projection).length > 0 ? this.projection : undefined,
        session: this.session,
      }
    )
    return result as T | null
  }

  /**
   * Counts the total number of documents matching the current query.
   *
   * @returns Promise resolving to the count.
   *
   * @example
   * ```typescript
   * const activeUserCount = await query.where('active', true).count();
   * ```
   */
  async count(): Promise<number> {
    return await this.nativeCollection.countDocuments(this.toFilter(), {
      session: this.session,
    })
  }

  /**
   * Checks if any documents match the current query.
   *
   * Optimized to fetch only one document.
   *
   * @returns Promise resolving to true if at least one match exists, false otherwise.
   *
   * @example
   * ```typescript
   * if (await query.where('email', email).exists()) {
   *   throw new Error('Email already taken');
   * }
   * ```
   */
  async exists(): Promise<boolean> {
    const count = await this.nativeCollection.countDocuments(this.toFilter(), {
      limit: 1,
      session: this.session,
    })
    return count > 0
  }

  /**
   * Retrieves all unique values for a specific field within matching documents.
   *
   * @param field - The field name to get distinct values for.
   * @returns Promise resolving to an array of distinct values.
   *
   * @example
   * ```typescript
   * const roles = await query.distinct('role');
   * // ['admin', 'user', 'guest']
   * ```
   */
  async distinct(field: string): Promise<unknown[]> {
    return await this.nativeCollection.distinct(field, this.toFilter(), {
      session: this.session,
    })
  }

  // ============================================================================
  // Write Operations
  // ============================================================================

  /**
   * Inserts a single document into the collection.
   *
   * @param document - The document to insert.
   * @returns Promise resolving to the insertion result containing the new ID.
   * @throws {Error} If the document violates schema validation or uniqueness constraints.
   *
   * @example
   * ```typescript
   * const result = await query.insert({
   *   name: 'New Product',
   *   price: 99.99
   * });
   * console.log(result.insertedId);
   * ```
   */
  async insert(document: Partial<T>): Promise<InsertResult> {
    const result = await this.nativeCollection.insertOne(document as MongoDocument, {
      session: this.session,
    })
    return {
      insertedId: result.insertedId.toString(),
      acknowledged: result.acknowledged,
    }
  }

  /**
   * Inserts multiple documents efficiently.
   *
   * @param documents - Array of documents to insert.
   * @returns Promise resolving to the bulk insertion result.
   *
   * @example
   * ```typescript
   * await query.insertMany([
   *   { name: 'Item A' },
   *   { name: 'Item B' }
   * ]);
   * ```
   */
  async insertMany(documents: Partial<T>[]): Promise<InsertManyResult> {
    const result = await this.nativeCollection.insertMany(documents as MongoDocument[], {
      session: this.session,
    })
    return {
      insertedIds: Object.values(result.insertedIds).map((id) => id.toString()),
      insertedCount: result.insertedCount,
      acknowledged: result.acknowledged,
    }
  }

  /**
   * Updates documents matching the current query filters.
   *
   * Updates the first matching document.
   *
   * @param update - The update operations (e.g. { $set: { ... } } or simple object { field: value }).
   * @returns Promise resolving to the update result.
   *
   * @example Simple update
   * ```typescript
   * await query.where('id', 1).update({ status: 'active' });
   * ```
   *
   * @example Atomic operator update
   * ```typescript
   * await query.where('id', 1).update({ $inc: { loginCount: 1 } });
   * ```
   */
  async update(update: UpdateDocument): Promise<UpdateResult> {
    const updateDoc = this.normalizeUpdate(update)
    const result = await this.nativeCollection.updateOne(this.toFilter(), updateDoc, {
      session: this.session,
    })
    return {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      acknowledged: result.acknowledged,
      ...(result.upsertedId ? { upsertedId: result.upsertedId.toString() } : {}),
    }
  }

  /**
   * Updates all documents matching the current query filters.
   *
   * @param update - The update operations.
   * @returns Promise resolving to the update result.
   *
   * @example
   * ```typescript
   * // Archive all old logs
   * await query.where('createdAt', '<', lastYear).updateMany({ archived: true });
   * ```
   */
  async updateMany(update: UpdateDocument): Promise<UpdateResult> {
    const updateDoc = this.normalizeUpdate(update)
    const result = await this.nativeCollection.updateMany(this.toFilter(), updateDoc, {
      session: this.session,
    })
    return {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      acknowledged: result.acknowledged,
      ...(result.upsertedId ? { upsertedId: result.upsertedId.toString() } : {}),
    }
  }

  /**
   * Deletes the first document matching the current query filters.
   *
   * @returns Promise resolving to the delete result.
   *
   * @example
   * ```typescript
   * await query.where('id', 123).delete();
   * ```
   */
  async delete(): Promise<DeleteResult> {
    const result = await this.nativeCollection.deleteOne(this.toFilter(), {
      session: this.session,
    })
    return {
      deletedCount: result.deletedCount,
      acknowledged: result.acknowledged,
    }
  }

  /**
   * Deletes all documents matching the current query filters.
   *
   * @returns Promise resolving to the delete result.
   *
   * @example
   * ```typescript
   * // Clean up spam
   * await query.where('isSpam', true).deleteMany();
   * ```
   */
  async deleteMany(): Promise<DeleteResult> {
    const result = await this.nativeCollection.deleteMany(this.toFilter(), {
      session: this.session,
    })
    return {
      deletedCount: result.deletedCount,
      acknowledged: result.acknowledged,
    }
  }

  /**
   * Executes a bulk write operation.
   *
   * Performs multiple write operations (insert, update, delete) in a single batch.
   *
   * @param operations - Array of write operations.
   * @returns Promise resolving to the bulk write result.
   *
   * @example
   * ```typescript
   * await query.bulkWrite([
   *   { insertOne: { document: { name: 'A' } } },
   *   { updateOne: { filter: { name: 'B' }, update: { $set: { val: 2 } } } },
   *   { deleteOne: { filter: { name: 'C' } } }
   * ]);
   * ```
   */
  async bulkWrite(operations: BulkWriteOperation<T>[]): Promise<BulkWriteResult> {
    const result = (await this.nativeCollection.bulkWrite(operations as unknown[], {
      session: this.session,
    })) as BulkWriteResult

    return {
      insertedCount: result.insertedCount,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      deletedCount: result.deletedCount,
      upsertedCount: result.upsertedCount,
      acknowledged: result.acknowledged,
    }
  }

  /**
   * Watches the collection for real-time changes.
   *
   * Returns an async iterable that yields change events as they occur in the database.
   * Note: Requires the database to be a replica set.
   *
   * @param pipeline - Optional aggregation pipeline to filter events.
   * @param options - Configuration for the change stream.
   * @returns An async iterable of change events.
   *
   * @example
   * ```typescript
   * const stream = query.watch([
   *   { $match: { operationType: 'insert' } }
   * ]);
   *
   * for await (const change of stream) {
   *   console.log('New document:', change.fullDocument);
   * }
   * ```
   */
  watch(pipeline?: PipelineStage[], options?: ChangeStreamOptions): AsyncIterable<ChangeEvent<T>> {
    const changeStream = this.nativeCollection.watch(
      (pipeline ?? []) as Record<string, unknown>[],
      options as Record<string, unknown>
    )

    return {
      [Symbol.asyncIterator]: () => ({
        next: async () => {
          const hasNext = await changeStream.hasNext()
          if (!hasNext) {
            return { done: true, value: undefined }
          }
          const event = await changeStream.next()
          return { done: false, value: event as ChangeEvent<T> }
        },
        return: async () => {
          await changeStream.close()
          return { done: true, value: undefined }
        },
      }),
    }
  }

  // ============================================================================
  // Aggregation
  // ============================================================================

  /**
   * Starts a new Aggregation Pipeline.
   *
   * Returns an aggregate builder instance initialized with any filters already applied to the query.
   *
   * @returns A MongoAggregateContract instance.
   *
   * @example
   * ```typescript
   * const stats = await query
   *   .where('status', 'active')
   *   .aggregate()
   *   .group({ _id: '$category', total: { $sum: 1 } })
   *   .get();
   * ```
   */
  aggregate(): MongoAggregateContract<T> {
    return new MongoAggregateBuilder<T>(this.nativeCollection, this.toFilter())
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Converts the current builder state to a MongoDB filter document.
   *
   * Useful for debugging or passing to low-level drivers.
   *
   * @returns The raw MongoDB filter object.
   */
  toFilter(): FilterDocument {
    const hasMainFilters = Object.keys(this.filters).length > 0
    const hasOrFilters = this.orFilters.length > 0

    if (!hasOrFilters) {
      return { ...this.filters }
    }

    if (!hasMainFilters) {
      return {
        $or: this.orFilters,
      }
    }

    return {
      $or: [this.filters, ...this.orFilters],
    }
  }

  /**
   * Creates a deep copy of the query builder.
   *
   * Allows branching query logic without affecting the original builder instance.
   *
   * @returns A new independent instance of the query builder.
   *
   * @example
   * ```typescript
   * const baseQuery = query.where('active', true);
   * const admins = baseQuery.clone().where('role', 'admin');
   * const users = baseQuery.clone().where('role', 'user');
   * ```
   */
  clone(): MongoCollectionContract<T> {
    const cloned = new MongoQueryBuilder<T>(
      this.nativeCollection,
      this.collectionName,
      this.session
    )
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
    const hasOperator = Object.keys(update).some((key) => key.startsWith('$'))
    if (hasOperator) {
      return update
    }
    return { $set: update }
  }

  private async getObjectId(): Promise<MongoObjectIdConstructor> {
    if (MongoQueryBuilder.ObjectIdCtor) {
      return MongoQueryBuilder.ObjectIdCtor
    }
    const { ObjectId } = await import('mongodb')
    MongoQueryBuilder.ObjectIdCtor = ObjectId as unknown as MongoObjectIdConstructor
    return MongoQueryBuilder.ObjectIdCtor
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
    return (await cursor.toArray()) as T[]
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
/**
 * Partial interface representing the MongoDB native Collection.
 *
 * This interface provides a type-safe way to interact with common MongoDB
 * collection methods without requiring the full `@types/mongodb` dependency
 * in all environments.
 *
 * @public
 * @since 3.0.0
 */
export interface MongoNativeCollection {
  find(filter: FilterDocument, options?: Record<string, unknown>): MongoCursor
  findOne(filter: FilterDocument, options?: Record<string, unknown>): Promise<unknown>
  insertOne(
    doc: MongoDocument,
    options?: Record<string, unknown>
  ): Promise<{ insertedId: MongoObjectId; acknowledged: boolean }>
  insertMany(
    docs: MongoDocument[],
    options?: Record<string, unknown>
  ): Promise<{
    insertedIds: Record<number, MongoObjectId>
    insertedCount: number
    acknowledged: boolean
  }>
  updateOne(
    filter: FilterDocument,
    update: UpdateDocument,
    options?: Record<string, unknown>
  ): Promise<MongoUpdateResult>
  updateMany(
    filter: FilterDocument,
    update: UpdateDocument,
    options?: Record<string, unknown>
  ): Promise<MongoUpdateResult>
  deleteOne(
    filter: FilterDocument,
    options?: Record<string, unknown>
  ): Promise<{ deletedCount: number; acknowledged: boolean }>
  deleteMany(
    filter: FilterDocument,
    options?: Record<string, unknown>
  ): Promise<{ deletedCount: number; acknowledged: boolean }>
  countDocuments(filter: FilterDocument, options?: Record<string, unknown>): Promise<number>
  distinct(
    field: string,
    filter: FilterDocument,
    options?: Record<string, unknown>
  ): Promise<unknown[]>
  aggregate(pipeline: Record<string, unknown>[]): MongoCursor
  bulkWrite(operations: unknown[], options?: Record<string, unknown>): Promise<unknown>
  watch(pipeline: Record<string, unknown>[], options?: Record<string, unknown>): MongoChangeStream
}

interface MongoChangeStream {
  hasNext(): Promise<boolean>
  next(): Promise<unknown>
  close(): Promise<void>
}

interface MongoCursor {
  toArray(): Promise<unknown[]>
}

interface MongoObjectId {
  toString(): string
}

interface MongoObjectIdConstructor {
  new (id: string): MongoObjectId
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
