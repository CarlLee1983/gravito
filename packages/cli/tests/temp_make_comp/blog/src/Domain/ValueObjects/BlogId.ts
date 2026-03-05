import { ValueObject } from '@gravito/enterprise'

interface IdProps {
  value: string
}

export class BlogId extends ValueObject<IdProps> {
  constructor(value: string) {
    super({ value })
  }

  static create(): BlogId {
    return new BlogId(crypto.randomUUID())
  }

  get value(): string {
    return this.props.value
  }
}
