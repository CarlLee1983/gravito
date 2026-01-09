import { Entity } from '@gravito/enterprise'

export interface PaymentProps {
  name: string
  createdAt: Date
}

export class Payment extends Entity<string> {
  constructor(
    id: string,
    private props: PaymentProps
  ) {
    super(id)
  }

  static create(id: string, name: string): Payment {
    return new Payment(id, {
      name,
      createdAt: new Date(),
    })
  }

  get name() {
    return this.props.name
  }
}
