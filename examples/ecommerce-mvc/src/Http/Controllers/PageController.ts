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

  /**
   * News Detail Page
   */
  static async newsShow(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as InertiaService
    const i18n = ctx.get('i18n') as any
    const locale = i18n.getLocale()
    const id = Number(ctx.req.param('id'))

    // Detailed content mapping
    const newsContent: any = {
      1: {
        zh: {
          title: '夏季大促：全館 8 折起！',
          content:
            '親愛的顧客，夏天已經悄悄來到！為了讓您在這個季節擁有最完美的穿搭，Gravito Shop 特別推出了「夏季大促」活動。\n\n**活動詳情：**\n- 全館商品 8 折起\n- 指定新品享 9 折優惠\n- 滿 NT$2,000 再送限量品牌帆布袋\n\n快開始選購吧！',
        },
        en: {
          title: 'Summer Sale: Up to 20% OFF!',
          content:
            'Dear customers, summer is here! To help you look your best this season, Gravito Shop is launching our exclusive Summer Sale.\n\n**Promotion Details:**\n- Up to 20% OFF site-wide\n- 10% OFF on selected new arrivals\n- Free limited edition tote bag for orders over $100\n\nEnjoy the sun!',
        },
        ja: {
          title: 'サマーセール：全品20%OFFから！',
          content:
            'お客様へ、夏がやってきました！この季節にぴったりのスタイルを楽しんでいただけるよう、Gravito Shopでは特別に「サマーセール」を開催いたします。\n\n**イベント詳細：**\n- 全品20%OFFから\n- 新着アイテム10%OFF\n- 10,000円以上のお買い上げで限定トートバッグをプレゼント',
        },
      },
      2: {
        zh: {
          title: '全新「極簡系列」服飾現已上架',
          content:
            '本季我們回歸初心，推出了全新的「極簡系列」。\n\n我們深信，真正的優雅來自於剪裁與材質的結合。這系列採用了頂級有機棉與亞麻，不僅親膚透氣，更能在極簡中展現不凡品味。',
        },
        en: {
          title: 'New Arrival: Minimalist Collection',
          content:
            'This season, we return to basics with our brand new Minimalist Collection.\n\nWe believe true elegance comes from the perfect blend of cut and material. Using premium organic cotton and linen, this collection offers both breathability and sophisticated style.',
        },
        ja: {
          title: '新登場「ミニマリストシリーズ」販売開始',
          content:
            '今シーズン、私たちは原点に立ち返り、新しい「ミニマリスト・コレクション」を発表しました。\n\n真のエレガンスは、シルエットと素材の融合から生まれると信じています。プレミアムなオーガニックコットンとリネンを使用し、快適さと洗練されたスタイルを両立させました。',
        },
      },
      3: {
        zh: {
          title: 'Gravito Framework V1.1 核心升級公告',
          content:
            '我們剛剛完成了一次重大的引擎升級，現在網站載入速度提升了 40%，為您提供更順暢的購物體驗。\n\n這次升級不僅提升了性能，還修復了多個已知問題，讓購物流程更加穩定與安全。',
        },
        en: {
          title: 'Gravito Framework V1.1 Core Upgrade Announcement',
          content:
            'We just completed a major engine upgrade. Loading speeds are now 40% faster, providing you with a smoother shopping experience.\n\nThis upgrade not only improves performance but also fixes several known issues, making the process more stable and secure.',
        },
        ja: {
          title: 'Gravito Framework V1.1 コアアップデートのお知らせ',
          content:
            'エンジンを大幅にアップデートしました。読み込み速度が40%向上し、より快適な体験を提供します。\n\nこのアップデートにより、パフォーマンスが向上しただけでなく、複数の既知のバグも修正され、ショッピングがより安定かつ安全になりました。',
        },
      },
    }

    const lang = locale.startsWith('zh') ? 'zh' : locale === 'ja' ? 'ja' : 'en'
    const details = newsContent[id]?.[lang]

    if (!details) {
      return ctx.redirect('/pages/news')
    }

    const item = {
      id,
      title: details.title,
      content: details.content,
      date: id === 1 ? '2026-01-12' : id === 2 ? '2026-01-10' : '2026-01-05',
      category: id === 1 ? 'promotion' : id === 2 ? 'new_arrival' : 'announcement',
      image:
        id === 1
          ? 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=80'
          : id === 2
            ? 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80'
            : 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
    }

    return inertia.render('News/Show', { item })
  }
}
