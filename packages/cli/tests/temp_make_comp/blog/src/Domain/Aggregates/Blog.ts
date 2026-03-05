import { AggregateRoot } from '@gravito/enterprise'
import { BlogCreated } from '../Events/BlogCreated'
import type { BlogId } from '../ValueObjects/BlogId'

export interface BlogProps {
  name: string
  createdAt: Date
}

export class Blog extends AggregateRoot<BlogId> {
  constructor(
    id: BlogId,
    private props: BlogProps
  ) {
    super(id)
  }

  static create(id: BlogId, name: string): Blog {
    const aggregate = new Blog(id, {
      name,
      createdAt: new Date(),
    })

    aggregate.addDomainEvent(new BlogCreated(id.value))

    return aggregate
  }

  get name() {
    return this.props.name
  }
}
