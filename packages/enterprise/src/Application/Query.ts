/**
 * Base Query
 *
 * Represents an intent to retrieve data from the system.
 */
export abstract class Query {}

/**
 * Query Handler Interface
 */
export interface QueryHandler<TQuery extends Query, TResult> {
  handle(query: TQuery): Promise<TResult>
}
