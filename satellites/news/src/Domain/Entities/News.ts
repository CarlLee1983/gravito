import { Entity } from '@gravito/enterprise'

export interface NewsProps {
  title: string
  slug: string
  excerpt: string
  content: string
  thumbnail?: string
  category: string
  status: 'DRAFT' | 'PUBLISHED'
  publishedAt?: Date
  createdAt: Date
}

export class News extends Entity<string> {
  private _props: NewsProps

  constructor(props: NewsProps, id?: string) {
    super(id || crypto.randomUUID())
    this._props = props
  }

  unpack() {
    return { ...this._props }
  }
}
