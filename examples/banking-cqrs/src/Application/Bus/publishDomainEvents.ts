import type { PlanetCore } from '@gravito/core'
import type { DomainEvent } from '@gravito/enterprise'

/**
 * Publish Domain Events Helper
 *
 * Centralizes the pattern of pulling domain events from one or more aggregates
 * and publishing them through the Gravito hooks system. This eliminates the
 * repetition of this common pattern across all Command Handlers.
 *
 * **Usage:**
 * ```typescript
 * const account = Account.create(...)
 * await repository.save(account)
 * await publishDomainEvents(this.core, account)
 * ```
 *
 * **Multiple Aggregates:**
 * ```typescript
 * await publishDomainEvents(this.core, fromAccount, toAccount)
 * ```
 *
 * @param core - PlanetCore instance for hook publishing
 * @param aggregates - One or more aggregates with domain events to publish
 *
 * @since 1.0.0
 */
export async function publishDomainEvents(
  core: PlanetCore,
  ...aggregates: ReadonlyArray<{ pullDomainEvents(): DomainEvent[] }>
): Promise<void> {
  for (const aggregate of aggregates) {
    const events = aggregate.pullDomainEvents()
    for (const event of events) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await core.hooks.doAction('cqrs:domain-event', event as any)
    }
  }
}
