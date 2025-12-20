/**
 * Factory
 * @description Model factory for generating fake data
 */

/**
 * Factory State
 */
type FactoryState<T> = Partial<T>

/**
 * Factory Definition Function
 */
export type FactoryDefinition<T> = () => T

/**
 * Factory
 * Generate fake records for seeding
 * 
 * @example
 * ```typescript
 * const userFactory = new Factory<User>(() => ({
 *   name: faker.person.fullName(),
 *   email: faker.internet.email(),
 *   password: 'hashed_password',
 * }))
 * 
 * // Create 10 users
 * const users = userFactory.count(10).make()
 * 
 * // Create with overrides
 * const admin = userFactory.state({ role: 'admin' }).make()
 * ```
 */
export class Factory<T extends Record<string, unknown>> {
    private definition: FactoryDefinition<T>
    private _count = 1
    private _states: FactoryState<T>[] = []

    constructor(definition: FactoryDefinition<T>) {
        this.definition = definition
    }

    /**
     * Set the number of records to generate
     */
    count(n: number): this {
        this._count = n
        return this
    }

    /**
     * Apply state overrides
     */
    state(state: FactoryState<T>): this {
        this._states.push(state)
        return this
    }

    /**
     * Generate records without inserting
     */
    make(): T[] {
        const records: T[] = []

        for (let i = 0; i < this._count; i++) {
            let record = this.definition()

            // Apply states
            for (const state of this._states) {
                record = { ...record, ...state }
            }

            records.push(record)
        }

        // Reset for next use
        this._count = 1
        this._states = []

        return records
    }

    /**
     * Generate a single record
     */
    makeOne(): T {
        const records = this.make()
        return records[0] as T
    }

    /**
     * Generate records as raw objects (alias for make)
     */
    raw(): T[] {
        return this.make()
    }

    /**
     * Generate a single raw record
     */
    rawOne(): T {
        return this.makeOne()
    }

    /**
     * Create a sequence generator
     */
    sequence<K extends keyof T>(
        key: K,
        generator: (index: number) => T[K]
    ): this {
        const originalDefinition = this.definition
        this.definition = (() => {
            const item = originalDefinition()
            // Sequence will be applied in make()
            return item
        }) as FactoryDefinition<T>

        // Store sequence info for later application
        const sequenceState = (index: number) => ({ [key]: generator(index) }) as unknown as FactoryState<T>

        const originalMake = this.make.bind(this)
        this.make = () => {
            const records = originalMake()
            return records.map((record, index) => ({
                ...record,
                ...sequenceState(index),
            }))
        }

        return this
    }
}

/**
 * Helper to create a factory
 */
export function factory<T extends Record<string, unknown>>(
    definition: FactoryDefinition<T>
): Factory<T> {
    return new Factory<T>(definition)
}
