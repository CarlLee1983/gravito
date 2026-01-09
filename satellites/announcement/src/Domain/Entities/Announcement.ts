import { Entity } from '@gravito/enterprise'

export interface AnnouncementProps {
  title: string
  content: string
  type: 'INFO' | 'WARNING' | 'PROMOTION' | 'MAINTENANCE'
  displayType: 'BANNER' | 'MODAL' | 'NEWS'
  status: 'DRAFT' | 'PUBLISHED' | 'EXPIRED'
  priority: number
  startsAt: Date
  endsAt?: Date
  createdAt: Date
}

export class Announcement extends Entity<string> {
  private _props: AnnouncementProps

  constructor(props: AnnouncementProps, id?: string) {
    super(id || crypto.randomUUID())
    this._props = props
  }

  unpack() {
    return { ...this._props }
  }
}
