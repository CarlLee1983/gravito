import { Outlet } from 'react-router-dom'
import { useAdmin } from './AdminContext'
import { Sidebar } from './Sidebar'

export function AdminShell() {
  const { user, isAuthenticated, isLoading } = useAdmin()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-slate-500 font-medium animate-pulse">正在初始化控制台...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 font-sans p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              role="img"
              aria-label="Security Lock"
            >
              <title>安全鎖定</title>
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">安全存取驗證</h1>
          <p className="text-slate-500 mb-8 text-balance">
            此頁面受到受保護，請使用管理員帳號登入以存取 Gravito 控制中心。
          </p>
          <button
            type="button"
            className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all hover:-translate-y-0.5 active:translate-y-0"
            onClick={() => (window.location.href = '/login')}
          >
            前往登入
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 border-b border-slate-200 bg-white px-8 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span className="hover:text-slate-600 cursor-pointer">控制台</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-semibold">首頁概覽</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold text-slate-900">{user?.username}</div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-indigo-500 bg-indigo-50 px-1.5 rounded">
                {user?.roles?.[0] || 'Member'}
              </div>
            </div>
            <div className="w-10 h-10 bg-gradient-to-tr from-slate-200 to-slate-100 rounded-full border-2 border-white shadow-sm ring-1 ring-slate-200" />
          </div>
        </header>

        {/* Content Area */}
        <section className="flex-1 overflow-y-auto p-8 bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </section>
      </main>
    </div>
  )
}
