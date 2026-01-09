import { BelongsTo, BelongsToMany, column, DB, HasMany, Model } from '@gravito/atlas'
import { Category } from './Category'
import { Comment } from './Comment'
import { Tag } from './Tag'

export class Post extends Model {
  static table = 'posts'

  @column({ isPrimary: true })
  get id(): number {
    return this._attributes.id as number
  }
  set id(value: number) {
    this._setAttribute('id', value)
  }

  @column()
  get category_id(): number {
    return this._attributes.category_id as number
  }
  set category_id(value: number) {
    this._setAttribute('category_id', value)
  }

  @column()
  get slug(): string {
    return this._attributes.slug as string
  }
  set slug(value: string) {
    this._setAttribute('slug', value)
  }

  @column()
  get title(): string {
    return this._attributes.title as string
  }
  set title(value: string) {
    this._setAttribute('title', value)
  }

  @column()
  get excerpt(): string {
    return this._attributes.excerpt as string
  }
  set excerpt(value: string) {
    this._setAttribute('excerpt', value)
  }

  @column()
  get content(): string {
    return this._attributes.content as string
  }
  set content(value: string) {
    this._setAttribute('content', value)
  }

  @column()
  get author(): string {
    return this._attributes.author as string
  }
  set author(value: string) {
    this._setAttribute('author', value)
  }

  @column()
  get status(): string {
    return this._attributes.status as string
  }
  set status(value: string) {
    this._setAttribute('status', value)
  }

  @column()
  get feature_image(): string {
    return this._attributes.feature_image as string
  }
  set feature_image(value: string) {
    this._setAttribute('feature_image', value)
  }

  @column()
  get published_at(): Date | null {
    const val = this._attributes.published_at
    return val ? new Date(val as string | number | Date) : null
  }
  set published_at(value: Date | string | null) {
    this._setAttribute('published_at', value instanceof Date ? value.toISOString() : value)
  }

  @column()
  get created_at(): Date {
    return new Date(this._attributes.created_at as string | number | Date)
  }
  set created_at(value: Date | string) {
    this._setAttribute('created_at', value instanceof Date ? value.toISOString() : value)
  }

  @column()
  get updated_at(): Date {
    return new Date(this._attributes.updated_at as string | number | Date)
  }
  set updated_at(value: Date | string) {
    this._setAttribute('updated_at', value instanceof Date ? value.toISOString() : value)
  }

  @BelongsTo(() => Category, { foreignKey: 'category_id' })
  category!: Category

  @HasMany(() => Comment, { foreignKey: 'post_id' })
  comments!: Comment[]

  @BelongsToMany(() => Tag, { pivotTable: 'post_tags' })
  tags!: Tag[]

  /**
   * Get related posts based on shared tags.
   * Ranking by number of shared tags.
   */
  async getRelatedPosts(limit = 3): Promise<Post[]> {
    // 1. Get IDs of tags for current post
    const currentPostId = this.id

    // Using raw subquery logic via builder for best compatibility
    const relatedRows = await DB.table('posts')
      .select('posts.*')
      .select(DB.raw('COUNT(post_tags.tag_id) as shared_count') as any)
      .join('post_tags', 'posts.id', '=', 'post_tags.post_id')
      .whereRaw('post_tags.tag_id IN (SELECT tag_id FROM post_tags WHERE post_id = ?)', [
        currentPostId,
      ])
      .where('posts.id', '!=', currentPostId)
      .groupBy('posts.id')
      .orderByRaw('shared_count DESC')
      .limit(limit)
      .get()

    // Return as Post[]
    return relatedRows as unknown as Post[]
  }
}
