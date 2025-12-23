import { factory } from '@gravito/atlas'
import Post from '../../models/Post.js'
import { Fake } from './Fake.js'

export const PostFactory = factory(() => ({
  title: Fake.sentence(),
  content: Fake.paragraph(),
  is_published: Fake.boolean(),
}), { model: Post as any, table: 'posts' })
