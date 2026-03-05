import { DomainEvent } from '@gravito/enterprise'

export class BlogCreated extends DomainEvent {
  constructor(public readonly aggregateId: string) {
    super()
  }

  get eventName(): string {
    return 'blog.created'
  }
}
