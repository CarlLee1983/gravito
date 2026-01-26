import type { DirectoryNode } from '../../types'

export class SharedKernelGenerator {
  generate(): DirectoryNode {
    return {
      type: 'directory',
      name: 'Shared',
      children: [
        {
          type: 'directory',
          name: 'Domain',
          children: [
            {
              type: 'directory',
              name: 'ValueObjects',
              children: [
                { type: 'file', name: 'Id.ts', content: this.generateIdValueObject() },
                { type: 'file', name: 'Money.ts', content: this.generateMoneyValueObject() },
                { type: 'file', name: 'Email.ts', content: this.generateEmailValueObject() },
              ],
            },
          ],
        },
        {
          type: 'directory',
          name: 'Infrastructure',
          children: [
            {
              type: 'directory',
              name: 'EventBus',
              children: [
                {
                  type: 'file',
                  name: 'EventDispatcher.ts',
                  content: this.generateEventDispatcher(),
                },
              ],
            },
          ],
        },
        {
          type: 'directory',
          name: 'Exceptions',
          children: [
            { type: 'file', name: 'Handler.ts', content: this.generateExceptionHandler() },
          ],
        },
      ],
    }
  }

  private generateIdValueObject(): string {
    return `/**
 * ID Value Object
 *
 * Shared identifier across all contexts.
 */

import { ValueObject } from '@gravito/enterprise'

interface IdProps {
    value: string
}

export class Id extends ValueObject<IdProps> {
  private constructor(value: string) {
    super({ value })
  }

  static create(): Id {
    return new Id(crypto.randomUUID())
  }

  static from(value: string): Id {
    if (!value) throw new Error('Id cannot be empty')
    return new Id(value)
  }

  get value(): string {
    return this.props.value
  }

  toString(): string {
    return this.props.value
  }
}
`
  }

  private generateMoneyValueObject(): string {
    return `/**
 * Money Value Object
 */

import { ValueObject } from '@gravito/enterprise'

interface MoneyProps {
    amount: number
    currency: string
}

export class Money extends ValueObject<MoneyProps> {
  constructor(amount: number, currency: string = 'USD') {
    if (amount < 0) throw new Error('Amount cannot be negative')
    super({ amount, currency })
  }

  get amount(): number {
    return this.props.amount
  }

  get currency(): string {
    return this.props.currency
  }

  add(other: Money): Money {
    this.assertSameCurrency(other)
    return new Money(this.amount + other.amount, this.currency)
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other)
    return new Money(this.amount - other.amount, this.currency)
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error('Cannot operate on different currencies')
    }
  }
}
`
  }

  private generateEmailValueObject(): string {
    return `/**
 * Email Value Object
 */

import { ValueObject } from '@gravito/enterprise'

interface EmailProps {
    value: string
}

export class Email extends ValueObject<EmailProps> {
  private constructor(value: string) {
    super({ value: value.toLowerCase().trim() })
  }

  static create(email: string): Email {
    if (!Email.isValid(email)) {
      throw new Error(\`Invalid email: \${email}\`)
    }
    return new Email(email)
  }

  static isValid(email: string): boolean {
    return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)
  }

  get value(): string {
    return this.props.value
  }
}
`
  }

  private generateEventDispatcher(): string {
    return `/**
 * Event Dispatcher
 */

import type { DomainEvent } from '@gravito/enterprise'

type EventHandler = (event: DomainEvent) => void | Promise<void>

export class EventDispatcher {
  private handlers: Map<string, EventHandler[]> = new Map()

  subscribe(eventName: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventName) ?? []
    handlers.push(handler)
    this.handlers.set(eventName, handlers)
  }

  async dispatch(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventName) ?? []
    for (const handler of handlers) {
      await handler(event)
    }
  }

  async dispatchAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.dispatch(event)
    }
  }
}
`
  }

  private generateExceptionHandler(): string {
    return `/**
 * Exception Handler
 */

export function report(error: unknown): void {
  console.error('[Exception]', error)
}
`
  }
}
