import type { GravitoContext } from '@gravito/core'
import type { InertiaService } from '@gravito/ion'
import { Category } from '../models/Category'
import { Comment } from '../models/Comment'
import { Post } from '../models/Post'
import { Subscriber } from '../models/Subscriber'

export class AdminController {
  /**
   * Admin Dashboard - list all posts with management tools
   */
  async dashboard(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as InertiaService
    const page = Number(ctx.req.query('page') || 1)

    const posts = await Post.query().with('category').orderBy('id', 'desc').paginate(10, page)

    const stats = {
      totalPosts: await Post.query().count(),
      subscribers: await Subscriber.query().count(),
      totalComments: await Comment.query().count(),
      pendingComments: await Comment.query().where('is_approved', false).count(),
    }

    return inertia.render('Admin/Dashboard', {
      posts,
      stats,
    })
  }

  /**
   * Create post page
   */
  async create(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as InertiaService
    const categories = await Category.all()

    return inertia.render('Admin/CreatePost', {
      categories,
    })
  }

  /**
   * Edit post page
   */
  async edit(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as InertiaService
    const id = ctx.req.param('id')
    const post = await Post.find(id)
    const categories = await Category.all()

    if (!post) {
      return ctx.text('Post Not Found', 404)
    }

    return inertia.render('Admin/EditPost', {
      post,
      categories,
    })
  }
}
