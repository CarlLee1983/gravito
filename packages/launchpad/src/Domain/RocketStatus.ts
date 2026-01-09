/**
 * 火箭生命週期狀態
 */
export enum RocketStatus {
  IDLE = 'IDLE', // 待命：容器運行中，無任務
  PREPARING = 'PREPARING', // 裝填：正在注入代碼 (Locked)
  ORBITING = 'ORBITING', // 運行：應用服務中
  REFURBISHING = 'REFURBISHING', // 翻新：正在清理環境
  DECOMMISSIONED = 'DECOMMISSIONED', // 除役：容器已移除
}
