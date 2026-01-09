import { ChevronDown, LayoutDashboard } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAdmin } from './AdminContext'
import { cn } from './utils' // 稍後建立

export function Sidebar() {
  const { menu, permissions } = useAdmin()

  // 簡單的權限檢查過濾
  const filterMenu = (nodes: any[]) => {
    return nodes.filter((node) => {
      if (node.permission && !permissions.includes(node.permission)) {
        return false
      }
      return true
    })
  }

  return (
    <aside className="w-64 bg-slate-900 text-white h-screen flex flex-col">
      <div className="p-6 flex items-center gap-2">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold">
          G
        </div>
        <span className="text-xl font-bold tracking-tight">Gravito Admin</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 space-y-2 py-4">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
              isActive
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            )
          }
        >
          <LayoutDashboard size={20} />
          <span>控制台</span>
        </NavLink>

        <div className="pt-4 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          系統功能
        </div>

        {filterMenu(menu).map((node) => (
          <div key={node.id}>
            {node.type === 'item' ? (
              <NavLink
                to={node.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                    isActive
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  )
                }
              >
                {/* 這裡未來可以動態渲染 node.icon */}
                <div className="w-5" />
                <span>{node.title}</span>
              </NavLink>
            ) : (
              <div className="space-y-1">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-3 py-2 text-slate-400 hover:text-white group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-5" />
                    <span>{node.title}</span>
                  </div>
                  <ChevronDown size={16} className="text-slate-600 group-hover:text-white" />
                </button>
                <div className="ml-4 pl-4 border-l border-slate-800 space-y-1">
                  {filterMenu(node.children).map((child) => (
                    <NavLink
                      key={child.id}
                      to={child.path}
                      className={({ isActive }) =>
                        cn(
                          'block px-3 py-1.5 text-sm rounded-md transition-colors',
                          isActive
                            ? 'text-indigo-400 font-medium'
                            : 'text-slate-500 hover:text-white'
                        )
                      }
                    >
                      {child.title}
                    </NavLink>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  )
}
