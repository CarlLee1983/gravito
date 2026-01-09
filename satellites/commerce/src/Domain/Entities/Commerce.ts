import { Entity } from '@gravito/enterprise'

export interface CommerceProps {
  name: string
  createdAt: Date
}

export class Commerce extends Entity<string> {
  constructor(
    id: string,
    private props: CommerceProps
  ) {
    super(id)
  }

  static create(id: string, name: string): Commerce {
    return new Commerce(id, {
      name,
      createdAt: new Date(),
    })
  }

  get name() {
    return this.props.name
  }
}
