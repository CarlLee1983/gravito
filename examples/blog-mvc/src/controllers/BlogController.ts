import { app, type GravitoContext } from '@gravito/core'
import type { InertiaService } from '@gravito/ion'
import { Category } from '../models/Category'
import { Post } from '../models/Post'

export class BlogController {
  /**
   * Home page - list all posts
   */
  async index(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as InertiaService
    const query = ctx.req.query('search')
    const categorySlug = ctx.req.query('category')
    const page = Number(ctx.req.query('page') || 1)

    const postsQuery = Post.query()
      .where('status', 'published')
      .with('category')
      .orderBy('id', 'desc')

    // Search Filter
    if (query) {
      postsQuery.where((q) => {
        q.where('title', 'like', `%${query}%`).orWhere('excerpt', 'like', `%${query}%`)
      })
    }

    // Category Filter
    if (categorySlug) {
      const { Category } = await import('../models/Category')
      const cat = await Category.query().where('slug', categorySlug).first()
      if (cat) {
        postsQuery.where('category_id', cat.id)
      }
    }

    const posts = await postsQuery.paginate(10, page)

    return inertia.render('Home', {
      posts,
      filters: {
        search: query,
        category: categorySlug,
      },
    })
  }

  /**
   * Post detail page
   */
  async show(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as InertiaService
    const slug = ctx.req.param('slug')

    const post = await Post.query().where('slug', slug).with('category').first()

    if (!post) {
      return ctx.text('Not Found', 404)
    }

    return inertia.render('Post', {
      post,
    })
  }

  /**
   * Store new post
   */
  async store(ctx: GravitoContext) {
    const body = (await ctx.req.json()) as any

    const post = new Post()
    post.category_id = body.category_id
    post.title = body.title
    post.slug = body.slug
    post.excerpt = body.excerpt
    post.content = body.content
    post.author = body.author
    post.status = body.status || 'published'
    post.feature_image = body.feature_image
    post.published_at = post.status === 'published' ? new Date() : null

    try {
      await post.save()
      return ctx.redirect('/admin/dashboard')
    } catch (e: any) {
      const session = ctx.get('session') as any
      session.flash('errors', { title: 'Failed to save post. Possible duplicate slug.' })
      return ctx.redirect('/admin/posts/create')
    }
  }

  /**
   * Update existing post
   */
  async update(ctx: GravitoContext) {
    const id = ctx.req.param('id')
    const post = await Post.find(id)

    if (!post) {
      return ctx.text('Post Not Found', 404)
    }

    const body = (await ctx.req.json()) as any

    // Update attributes
    post.category_id = body.category_id
    post.title = body.title
    post.slug = body.slug
    post.excerpt = body.excerpt
    post.content = body.content
    post.author = body.author
    post.status = body.status || post.status
    post.feature_image = body.feature_image || post.feature_image

    if (post.status === 'published' && !post.published_at) {
      post.published_at = new Date()
    }

    await post.save()
    return ctx.redirect('/admin/dashboard')
  }

  /**
   * Delete post
   */
  async destroy(ctx: GravitoContext) {
    const id = ctx.req.param('id')
    const post = await Post.find(id)

    if (post) {
      await post.delete()
    }

    return ctx.redirect('/admin/dashboard')
  }
}
