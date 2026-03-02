export interface PermissionRegistryInput {
  key: string
  label: string
  description?: string
  groupName?: string
}

export interface IPermissionRegistry {
  /**
   * 註冊單一權限（冪等，key 已存在則跳過）
   */
  register(input: PermissionRegistryInput): Promise<void>

  /**
   * 批次註冊多個權限
   */
  registerMany(inputs: PermissionRegistryInput[]): Promise<void>

  /**
   * 取得已註冊的所有權限
   */
  getAll(): Promise<Array<{ key: string; label: string }>>
}
