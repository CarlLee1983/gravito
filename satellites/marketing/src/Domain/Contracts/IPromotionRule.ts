export interface MarketingAdjustment {
  label: string
  amount: number
  sourceType: string
  sourceId: string
}

export interface IPromotionRule {
  /**
   * 檢查訂單是否符合此規則
   * 支援 async 以便執行跨衛星的 DB 查詢
   */
  match(order: any, config: any): MarketingAdjustment | null | Promise<MarketingAdjustment | null>
}
