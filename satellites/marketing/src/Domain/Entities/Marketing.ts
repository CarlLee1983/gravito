import { Entity } from '@gravito/enterprise'

export interface MarketingProps {
  name: string
  createdAt: Date
}

export class Marketing extends Entity<string> {
  constructor(
    id: string,
    private props: MarketingProps
  ) {
    super(id)
  }

  static create(id: string, name: string): Marketing {
    return new Marketing(id, {
      name,
      createdAt: new Date(),
    })
  }

  get name() {
    return this.props.name
  }
}
