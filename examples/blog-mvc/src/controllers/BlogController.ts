import type { GravitoContext } from '@gravito/core'
import type { InertiaService } from '@gravito/ion'
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

    const post = await Post.query().where('slug', slug).with('category').with('tags').first()

    if (!post) {
      return ctx.text('Not Found', 404)
    }

    const relatedPosts = await post.getRelatedPosts(3)

    return inertia.render('Post', {
      post,
      relatedPosts,
    })
  }

  /**
   * Helper to extract body data (JSON or FormData)
   */
  private async getBody(
    ctx: GravitoContext
  ): Promise<{ body: any; isMultipart: boolean; formData?: FormData }> {
    const contentType = ctx.req.header('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await ctx.req.formData()
      const body: Record<string, any> = {}

      formData.forEach((value, key) => {
        // If it's a file but empty/invalid, ignore or handle specifically.
        // For now, key collisions (arrays) aren't handled but suffice for this simple form
        body[key] = value
      })
      return { body, isMultipart: true, formData }
    }

    return { body: await ctx.req.json(), isMultipart: false }
  }

  /**
   * Helper to handle file upload
   */
  private async handleUpload(
    file: File | string | null,
    ctx: GravitoContext
  ): Promise<string | null> {
    if (file && file instanceof File && file.size > 0 && file.name) {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
      const fileName = `${crypto.randomUUID()}.${ext}`

      const storage = ctx.get('storage') as any // Type assertion for now or import StorageManager type
      const disk = storage.disk() // Uses default driver which is currently s3-mock

      return await disk.put(file, fileName)
    }
    return null
  }

  /**
   * Store new post
   */
  async store(ctx: GravitoContext) {
    const { body, isMultipart } = await this.getBody(ctx)

    const post = new Post()
    post.category_id = Number(body.category_id)
    post.title = body.title as string
    post.slug = body.slug as string
    post.excerpt = body.excerpt as string
    post.content = body.content as string
    post.author = body.author as string
    post.status = (body.status as string) || 'published'

    // Handle image
    let featureImageUrl = body.feature_image as string
    if (isMultipart) {
      const uploadedUrl = await this.handleUpload(body.feature_image_file, ctx)
      if (uploadedUrl) {
        featureImageUrl = uploadedUrl
      }
    }
    post.feature_image = featureImageUrl || ''

    post.published_at = post.status === 'published' ? new Date() : null

    try {
      await post.save()
      return ctx.redirect('/admin/dashboard')
    } catch (e: any) {
      console.error(e)
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

    const { body, isMultipart } = await this.getBody(ctx)

    // Update attributes
    post.category_id = Number(body.category_id)
    post.title = body.title as string
    post.slug = body.slug as string
    post.excerpt = body.excerpt as string
    post.content = body.content as string
    post.author = body.author as string
    post.status = (body.status as string) || post.status

    let featureImageUrl = body.feature_image as string

    if (isMultipart) {
      const uploadedUrl = await this.handleUpload(body.feature_image_file, ctx)
      if (uploadedUrl) {
        featureImageUrl = uploadedUrl
      }
    }

    post.feature_image = featureImageUrl || post.feature_image || ''

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
