import { AdminProvider, ModuleRouter } from '@gravito/admin-shell-react'
import { AnalyticsModule } from '@gravito/admin-ui-analytics'
import { AnnouncementModule } from '@gravito/admin-ui-announcement'
// 引入各模組的 UI 定義
import { CatalogModule } from '@gravito/admin-ui-catalog'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import config from './config/gravito.config'

/**
 * 管理後台一鍵組裝入口 - 極簡版
 */
const AdminApp = () => {
  // 自動根據 Manifest 決定要加載的 UI 模組
  const modules = [
    config.modules.includes('catalog') && CatalogModule,
    config.modules.includes('analytics') && AnalyticsModule,
    config.modules.includes('cms') && AnnouncementModule,
  ].filter(Boolean) as any[]

  return (
    <BrowserRouter>
      <AdminProvider modules={modules} baseUrl="/api/admin">
        <ModuleRouter />
      </AdminProvider>
    </BrowserRouter>
  )
}

const container = document.getElementById('admin-root')
if (container) {
  const root = createRoot(container)
  root.render(<AdminApp />)
}
