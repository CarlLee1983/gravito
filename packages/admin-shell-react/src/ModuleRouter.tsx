import { Route, Routes } from 'react-router-dom'
import { useAdmin } from './AdminContext'
import { AdminShell } from './AdminShell'

/**
 * Automatically generates React Router routes from registered modules
 */
export function ModuleRouter() {
  const { modules } = useAdmin()

  return (
    <Routes>
      <Route element={<AdminShell />}>
        <Route path="/dashboard" element={<div>歡迎來到 Gravito 控制台</div>} />

        {/* 動態渲染各個衛星模組的路由 */}
        {modules.map((module) =>
          module.routes.map((route) => (
            <Route
              key={`${module.id}-${route.path}`}
              path={route.path}
              element={<route.component />}
            />
          ))
        )}

        {/* Fallback */}
        <Route path="/" element={<div>請選擇功能模組</div>} />
      </Route>
    </Routes>
  )
}
