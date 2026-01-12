/**
 * Shop Controller
 *
 * Public-facing shop pages: home, product, category.
 */

import { DB } from '@gravito/atlas'
import type { GravitoContext } from '@gravito/core'
import type { InertiaService } from '@gravito/ion'
import { SeoMetadata } from '@gravito/luminosity'
import { FALSE, sql, TRUE } from '../../utils/db'

export class ShopController {
  /**
   * Home page - featured products and categories
   */
  static async index(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as InertiaService

    // Get featured products
    const featuredResult = await DB.raw(
      sql(`
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = ${TRUE} AND p.is_featured = ${TRUE}
      LIMIT 8
    `)
    )

    // Get latest products
    const latestResult = await DB.raw(
      sql(`
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = ${TRUE}
      ORDER BY p.created_at DESC
      LIMIT 8
    `)
    )

    // Get all active categories
    const categoriesResult = await DB.raw(
      sql(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = ${TRUE}
      WHERE c.is_active = ${TRUE}
      GROUP BY c.id
      ORDER BY c.sort_order
    `)
    )

    // Latest news for home page (mock)
    const i18n = ctx.get('i18n') as any
    const locale = i18n?.getLocale() || 'zh-TW'
    const latestNews = [
      {
        id: 1,
        title:
          locale === 'zh-TW'
            ? '夏季大促：全館 8 折起！'
            : locale === 'ja'
              ? 'サマーセール：全品20%OFFから！'
              : 'Summer Sale: Up to 20% OFF!',
        date: '2026-01-12',
        category: 'promotion',
        excerpt:
          locale === 'zh-TW'
            ? '迎接夏日，Gravito Shop 推出限時優惠...'
            : locale === 'ja'
              ? '夏を迎え、Gravito Shopでは期間限定キャンペーンを...'
              : 'Celebrate summer with Gravito Shop! Limited time offers...',
      },
    ]

    const seo = {
      meta: {
        title: 'Gravito Shop - Premium Electronics & Gear',
        description:
          'Discover the latest in premium electronics, smart home devices, and developer gear.',
        keywords: ['electronics', 'gadgets', 'developer gear', 'smart keyboard'],
        canonical: `${process.env.APP_URL}/`,
      },
      og: {
        title: 'Gravito Shop - Premium Electronics & Gear',
        description: 'Discover the latest in premium electronics, smart home devices.',
        type: 'website',
        url: `${process.env.APP_URL}/`,
        siteName: 'Gravito Shop',
        image: {
          url: `${process.env.APP_URL}/og-image.jpg`,
          width: 1200,
          height: 630,
        },
      },
      twitter: {
        card: 'summary_large_image',
        site: '@gravito_dev',
      },
    }

    return inertia.render(
      'Home',
      {
        featuredProducts: featuredResult.rows,
        latestProducts: latestResult.rows,
        categories: categoriesResult.rows,
        latestNews: latestNews,
        seo,
      },
      {
        seoTags: new SeoMetadata(seo).toString(),
      }
    )
  }

  /**
   * Product listing with optional search
   */
  static async products(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as InertiaService

    const search = ctx.req.query('search') || ''
    const categorySlug = ctx.req.query('category') || ''
    const sort = ctx.req.query('sort') || 'latest'
    const page = parseInt(ctx.req.query('page') || '1', 10)
    const perPage = 12

    let whereClause = `WHERE p.is_active = ${TRUE}`
    const params: any[] = []

    if (search) {
      whereClause += ' AND (p.name LIKE ? OR p.description LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }

    if (categorySlug) {
      whereClause += ' AND c.slug = ?'
      params.push(categorySlug)
    }

    let orderClause = 'ORDER BY p.created_at DESC'
    if (sort === 'price_asc') orderClause = 'ORDER BY p.price ASC'
    else if (sort === 'price_desc') orderClause = 'ORDER BY p.price DESC'
    else if (sort === 'name') orderClause = 'ORDER BY p.name ASC'

    const offset = (page - 1) * perPage

    const productsResult = await DB.raw(
      sql(`
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
      ${orderClause}
      LIMIT ? OFFSET ?
    `),
      [...params, perPage, offset]
    )

    const countResult = await DB.raw<{ count: number }>(
      sql(`
      SELECT COUNT(*) as count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
    `),
      params
    )

    const total = countResult.rows[0]?.count || 0
    const totalPages = Math.ceil(total / perPage)

    const categoriesResult = await DB.raw(
      sql(`
      SELECT * FROM categories WHERE is_active = ${TRUE} ORDER BY sort_order
    `)
    )

    return inertia.render('Shop/Products', {
      products: productsResult.rows,
      categories: categoriesResult.rows,
      filters: { search, category: categorySlug, sort },
      pagination: { page, perPage, total, totalPages },
    })
  }

  /**
   * Single product page
   */
  static async show(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as InertiaService

    const slug = ctx.req.param('slug')

    const productResult = await DB.raw(
      sql(`
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.slug = ? AND p.is_active = ${TRUE}
    `),
      [slug]
    )

    const product = productResult.rows[0]

    if (!product) {
      return ctx.notFound()
    }

    // Related products (same category)
    const relatedResult = await DB.raw(
      sql(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.category_id = ? AND p.id != ? AND p.is_active = ${TRUE}
      LIMIT 4
    `),
      [(product as any).category_id, (product as any).id]
    )

    // Check if product is in wishlist
    let wishlistId = null
    if (ctx.auth?.user) {
      const wishlistResult = await DB.raw(
        sql('SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?'),
        [ctx.auth.user.id, (product as any).id]
      )
      if (wishlistResult.rows.length > 0) {
        wishlistId = wishlistResult.rows[0].id
      }
    }

    // Prepare dynamic SEO
    const p = product as any
    const seo = {
      meta: {
        title: `${p.name} - Gravito Shop`,
        description: p.description.substring(0, 160),
        keywords: [p.category_name, p.name],
        canonical: `${process.env.APP_URL}/products/${p.slug}`,
      },
      og: {
        title: p.name,
        description: p.description.substring(0, 200),
        type: 'product',
        url: `${process.env.APP_URL}/products/${p.slug}`,
        image: {
          url: p.image_url,
          alt: p.name,
        },
        siteName: 'Gravito Shop',
      },
      jsonLd: {
        '@context': 'https://schema.org/',
        '@type': 'Product',
        name: p.name,
        image: p.image_url,
        description: p.description,
        sku: p.id,
        offers: {
          '@type': 'Offer',
          priceCurrency: 'USD',
          price: p.price,
          availability: 'https://schema.org/InStock',
          url: `${process.env.APP_URL}/products/${p.slug}`,
        },
      },
    }

    return inertia.render(
      'Shop/Product',
      {
        product,
        relatedProducts: relatedResult.rows,
        wishlistId: wishlistId,
        seo,
      },
      {
        seoTags: new SeoMetadata(seo as any).toString(),
      }
    )
  }

  /**
   * Category page
   */
  static async category(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as InertiaService

    const slug = ctx.req.param('slug')
    const sort = ctx.req.query('sort') || 'latest'
    const page = parseInt(ctx.req.query('page') || '1', 10)
    const perPage = 12

    const categoryResult = await DB.raw(
      sql(`SELECT * FROM categories WHERE slug = ? AND is_active = ${TRUE}`),
      [slug]
    )
    const category = categoryResult.rows[0]

    if (!category) {
      return ctx.notFound()
    }

    let orderClause = 'ORDER BY p.created_at DESC'
    if (sort === 'price_asc') orderClause = 'ORDER BY p.price ASC'
    else if (sort === 'price_desc') orderClause = 'ORDER BY p.price DESC'
    else if (sort === 'name') orderClause = 'ORDER BY p.name ASC'

    const offset = (page - 1) * perPage

    const productsResult = await DB.raw(
      sql(`
      SELECT p.*
      FROM products p
      WHERE p.category_id = ? AND p.is_active = ${TRUE}
      ${orderClause}
      LIMIT ? OFFSET ?
    `),
      [(category as any).id, perPage, offset]
    )

    const countResult = await DB.raw<{ count: number }>(
      sql(`SELECT COUNT(*) as count FROM products WHERE category_id = ? AND is_active = ${TRUE}`),
      [(category as any).id]
    )

    const total = countResult.rows[0]?.count || 0
    const totalPages = Math.ceil(total / perPage)

    const c = category as any
    const seo = {
      meta: {
        title: `${c.name} - Gravito Shop`,
        description: `Browse our collection of ${c.name}. Premium quality guaranteed.`,
        keywords: [c.name, c.slug, 'shop'],
        canonical: `${process.env.APP_URL}/category/${c.slug}`,
      },
      og: {
        title: c.name,
        type: 'website',
        url: `${process.env.APP_URL}/category/${c.slug}`,
        siteName: 'Gravito Shop',
      },
    }

    return inertia.render(
      'Shop/Category',
      {
        category,
        products: productsResult.rows,
        filters: { sort },
        pagination: { page, perPage, total, totalPages },
        seo,
      },
      {
        seoTags: new SeoMetadata(seo as any).toString(),
      }
    )
  }

  /**
   * Search page
   */
  static async search(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as InertiaService

    const query = ctx.req.query('q') || ''
    const page = parseInt(ctx.req.query('page') || '1', 10)
    const perPage = 12
    const offset = (page - 1) * perPage

    let products: any[] = []
    let total = 0

    if (query.length >= 2) {
      const productsResult = await DB.raw(
        sql(`
        SELECT p.*, c.name as category_name, c.slug as category_slug
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.is_active = ${TRUE} AND (p.name LIKE ? OR p.description LIKE ?)
        ORDER BY p.name
        LIMIT ? OFFSET ?
      `),
        [`%${query}%`, `%${query}%`, perPage, offset]
      )

      products = productsResult.rows

      const countResult = await DB.raw<{ count: number }>(
        sql(`
        SELECT COUNT(*) as count
        FROM products
        WHERE is_active = ${TRUE} AND (name LIKE ? OR description LIKE ?)
      `),
        [`%${query}%`, `%${query}%`]
      )

      total = countResult.rows[0]?.count || 0
    }

    const totalPages = Math.ceil(total / perPage)

    return inertia.render('Shop/Search', {
      query,
      products,
      pagination: { page, perPage, total, totalPages },
    })
  }
}
