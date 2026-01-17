import type { PaginateResult } from '../../types'

/**
 * Trait for managing query pagination and chunking.
 *
 * @public
 * @since 3.0.0
 */
export abstract class CanPaginate {
  /**
   * Chunk the results of the query
   */
  async chunk(
    this: any,
    size: number,
    callback: (rows: any[]) => Promise<void | false>
  ): Promise<void> {
    let page = 1
    let count: number

    do {
      const results = await this.clone().paginate(size, page)
      count = results.data.length

      if (count === 0) break

      const result = await callback(results.data)
      if (result === false) break

      page++
    } while (count === size)
  }

  /**
   * Paginate the results of the query
   */
  async paginate(
    this: any,
    perPage = 15,
    page = 1,
    primaryKey = 'id'
  ): Promise<PaginateResult<any>> {
    // Ensure deterministic ordering for stable pagination
    if (typeof this.ensureDeterministicOrder === 'function') {
      this.ensureDeterministicOrder(primaryKey)
    }

    // Get total count
    const total = await this.clone().count()

    // Get paginated data
    const data = await this.limit(perPage)
      .offset((page - 1) * perPage)
      .get()

    return {
      data,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
        hasNext: page < Math.ceil(total / perPage),
        hasPrev: page > 1,
      },
    }
  }

  /**
   * Simple pagination (alias for paginate for now)
   */
  async simplePaginate(
    this: any,
    perPage = 15,
    page = 1,
    primaryKey = 'id'
  ): Promise<PaginateResult<any>> {
    return this.paginate(perPage, page, primaryKey)
  }

  /**
   * Ensure deterministic order for stable pagination
   */
  protected ensureDeterministicOrder(this: any, primaryKey: string): void {
    if (this.orders.length === 0) {
      this.orderBy(primaryKey, 'asc')
    }
  }
}
