import { Entity } from '@gravito/enterprise'

export interface MemberPasskeyProps {
  memberId: string
  credentialId: string
  publicKey: string
  counter: number
  transports?: string[]
  displayName?: string
  createdAt: Date
  updatedAt: Date
}

export class MemberPasskey extends Entity<string> {
  private constructor(
    id: string,
    private props: MemberPasskeyProps
  ) {
    super(id)
  }

  static create(params: {
    memberId: string
    credentialId: string
    publicKey: string
    transports?: string[]
    displayName?: string
    counter?: number
  }): MemberPasskey {
    const now = new Date()
    return new MemberPasskey(crypto.randomUUID(), {
      memberId: params.memberId,
      credentialId: params.credentialId,
      publicKey: params.publicKey,
      counter: params.counter ?? 0,
      transports: params.transports,
      displayName: params.displayName,
      createdAt: now,
      updatedAt: now,
    })
  }

  static reconstitute(id: string, props: MemberPasskeyProps): MemberPasskey {
    return new MemberPasskey(id, props)
  }

  get memberId(): string {
    return this.props.memberId
  }

  get credentialId(): string {
    return this.props.credentialId
  }

  get publicKey(): string {
    return this.props.publicKey
  }

  get counter(): number {
    return this.props.counter
  }

  get transports(): string[] | undefined {
    return this.props.transports
  }

  get displayName(): string | undefined {
    return this.props.displayName
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }

  public updateCounter(next: number): void {
    this.props.counter = next
    this.props.updatedAt = new Date()
  }

  toRecord(): Record<string, unknown> {
    return {
      id: this.id,
      member_id: this.memberId,
      credential_id: this.credentialId,
      public_key: this.publicKey,
      counter: this.counter,
      transports: this.transports ? JSON.stringify(this.transports) : null,
      display_name: this.displayName,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    }
  }
}
