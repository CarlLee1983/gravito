/**
 * Page Controller
 *
 * Handles static pages like contact, faq, shipping, returns.
 */

import type { GravitoContext } from '@gravito/core'
import type { InertiaService } from '@gravito/ion'

export class PageController {
  /**
   * FAQ Page
   */
  static async faq(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as InertiaService
    return inertia.render('Support/FAQ')
  }

  /**
   * Shipping Policy Page
   */
  static async shipping(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as InertiaService
    return inertia.render('Support/Shipping')
  }

  /**
   * Returns Policy Page
   */
  static async returns(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as InertiaService
    return inertia.render('Support/Returns')
  }

  /**
   * Contact/Support Page
   */
  static async contact(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as InertiaService
    return inertia.render('Support/Contact')
  }

  /**
   * Latest News Page
   */
  static async news(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as InertiaService
    const i18n = ctx.get('i18n') as any
    const locale = i18n.getLocale()

    // Mock news data
    const news = [
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
            ? '迎接夏日，Gravito Shop 推出限時優惠。活動期間購買指定商品即可享有超值折扣...'
            : locale === 'ja'
              ? '夏を迎え、Gravito Shopでは期間限定キャンペーンを実施。対象商品が特別価格に...'
              : 'Celebrate summer with Gravito Shop! Limited time offers on selected items...',
        image:
          'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=800&q=80',
      },
      {
        id: 2,
        title:
          locale === 'zh-TW'
            ? '全新「極簡系列」服飾現已上架'
            : locale === 'ja'
              ? '新登場「ミニマリストシリーズ」販売開始'
              : 'New "Minimalist Series" Now Available',
        date: '2026-01-10',
        category: 'new_arrival',
        excerpt:
          locale === 'zh-TW'
            ? '探索最新的極簡主義設計，結合舒適材質與現代裁剪，展現您的個人風格。'
            : locale === 'ja'
              ? '最新のミニマリズムデザイン。快適な素材とモダンなカットで、あなたらしさを表現。'
              : 'Discover our latest minimalist designs, combining comfort with modern tailoring.',
        image:
          'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
      },
      {
        id: 3,
        title:
          locale === 'zh-TW'
            ? 'Gravito Framework V1.1 核心升級公告'
            : locale === 'ja'
              ? 'Gravito Framework V1.1 コアアップデートのお知らせ'
              : 'Gravito Framework V1.1 Core Upgrade Announcement',
        date: '2026-01-05',
        category: 'announcement',
        excerpt:
          locale === 'zh-TW'
            ? '我們剛剛完成了一次重大的引擎升級，現在網站載入速度提升了 40%，為您提供更順暢的購物體驗。'
            : locale === 'ja'
              ? 'エンジンを大幅にアップデートしました。読み込み速度が40%向上し、より快適な体験を提供します。'
              : 'We just completed a major engine upgrade. Loading speeds are now 40% faster.',
        image:
          'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
      },
    ]

    return inertia.render('News/Index', { news })
  }
}
