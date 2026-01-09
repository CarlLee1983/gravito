import { AdminShell } from '@gravito/admin-shell-react'
import { AnalyticsAdminModule } from '@gravito/admin-ui-analytics'
import { AnnouncementAdminModule } from '@gravito/admin-ui-announcement'
// 引入各模組的 UI 定義
import { CatalogAdminModule } from '@gravito/admin-ui-catalog'
import React from 'react'
import { createRoot } from 'react-dom/client'
import config from './config/gravito.config'

/**
 * 管理後台一鍵組裝入口 - 極簡版
 */
const AdminApp = () => {
  // 自動根據 Manifest 決定要加載的 UI 模組
  const modules = [
    config.modules.includes('catalog') && new CatalogAdminModule(),
    config.modules.includes('analytics') && new AnalyticsAdminModule(),
    config.modules.includes('cms') && new AnnouncementAdminModule(),
  ].filter(Boolean) as any[]

  return <AdminShell title={config.name} modules={modules} authMode="session" />
}

const container = document.getElementById('admin-root')
if (container) {
  const root = createRoot(container)
  root.render(<AdminApp />)
}
