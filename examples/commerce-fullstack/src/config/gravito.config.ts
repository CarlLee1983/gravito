/**
 * Gravito 1.0 核心清單 (Manifest)
 * 這是操作者唯一的儀表板，只需宣告功能，不需處理實作
 */
export default {
  name: 'Gravito Shop',
  version: '1.0.0',

  // 功能模組選單：宣告即代表「後端 API + 前端 UI + 數據模型」同步點火
  modules: [
    'catalog', // 商品模組
    'membership', // 會員模組
    'analytics', // 報表模組
    'cms', // 內容管理 (公告、新聞、廣告)
    'support', // 客服模組
  ],

  // 站點設定
  settings: {
    locale: 'zh-TW',
    currency: 'TWD',
    theme: 'modern',
  },
}
