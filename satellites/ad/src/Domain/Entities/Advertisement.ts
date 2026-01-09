import { Entity } from '@gravito/enterprise'

export interface AdProps {
  slotSlug: string
  title: string
  imageUrl: string
  targetUrl: string
  weight: number // 1-10
  status: 'ACTIVE' | 'PAUSED'
  startsAt: Date
  endsAt: Date
  createdAt: Date
}

export class Advertisement extends Entity<string> {
  private _props: AdProps

  constructor(props: AdProps, id?: string) {
    super(id || crypto.randomUUID())
    this._props = props
  }

  unpack() {
    return { ...this._props }
  }
}
