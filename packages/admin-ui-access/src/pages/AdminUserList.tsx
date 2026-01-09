import { cn, useAdmin } from '@gravito/admin-shell-react'
import { Check, Loader2, Power, PowerOff, Shield, UserPlus, X } from 'lucide-react'
import type React from 'react'
import { useCallback, useEffect, useState } from 'react'

export function AdminUserList() {
  const { sdk } = useAdmin()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // 分配角色相關狀態
  const [roles, setRoles] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [selectedRoleIds, setSelectedUserRoleIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await sdk.api.get<any[]>('/users')
      setUsers(data)
    } catch (err) {
      console.error('Failed to fetch users', err)
    } finally {
      setLoading(false)
    }
  }, [sdk])

  const fetchRoles = useCallback(async () => {
    try {
      const data = await sdk.api.get<any[]>('/roles')
      setRoles(data)
    } catch (err) {
      console.error('Failed to fetch roles', err)
    }
  }, [sdk])

  const toggleStatus = async (user: any) => {
    try {
      await sdk.api.patch(`/users/${user.id}`, { isActive: !user.isActive })
      fetchUsers()
    } catch (_err) {
      alert('操作失敗')
    }
  }

  const openAssignModal = (user: any) => {
    setSelectedUser(user)
    setSelectedUserRoleIds(user.roles || [])
    setIsModalOpen(true)
    fetchRoles() // 確保角色清單是最新的
  }

  const handleAssignRoles = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) {
      return
    }

    setIsSubmitting(true)
    try {
      await sdk.api.patch(`/users/${selectedUser.id}`, { roles: selectedRoleIds })
      await fetchUsers()
      setIsModalOpen(false)
    } catch (err: any) {
      alert(err.message || '儲存失敗')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleRole = (roleName: string) => {
    setSelectedUserRoleIds((prev) =>
      prev.includes(roleName) ? prev.filter((r) => r !== roleName) : [...prev, roleName]
    )
  }

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">管理員帳號</h1>
          <p className="text-slate-500">管理具備後台存取權限的人員帳號</p>
        </div>
        <button
          type="button"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <UserPlus size={18} />
          邀請管理員
        </button>
      </div>

      {/* 使用者表格 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                管理員資訊
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                角色
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                狀態
              </th>
              <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              [1, 2].map((i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={4} className="px-6 py-8" />
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                  目前尚無管理員帳號
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                        {user.username[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{user.username}</div>
                        <div className="text-xs text-slate-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.length === 0 && (
                        <span className="text-slate-300 italic text-xs">未分配</span>
                      )}
                      {user.roles.map((r: string) => (
                        <span
                          key={r}
                          className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-100 flex items-center gap-1"
                        >
                          <Shield size={10} />
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                        user.isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}
                      />
                      {user.isActive ? '正常' : '已停權'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => toggleStatus(user)}
                        className={`p-2 rounded-lg transition-all ${
                          user.isActive
                            ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                            : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={user.isActive ? '停權' : '啟用'}
                      >
                        {user.isActive ? <PowerOff size={16} /> : <Power size={16} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => openAssignModal(user)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        title="分配角色"
                      >
                        <Shield size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分配角色 Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">分配角色</h2>
                <p className="text-sm text-slate-500">
                  正在設定 {selectedUser?.username} 的權限角色
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAssignRoles}>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                {roles.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 italic">尚無角色可供選擇</div>
                ) : (
                  roles.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => toggleRole(role.name)}
                      className={cn(
                        'w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left',
                        selectedRoleIds.includes(role.name)
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Shield
                          size={18}
                          className={
                            selectedRoleIds.includes(role.name)
                              ? 'text-indigo-600'
                              : 'text-slate-400'
                          }
                        />
                        <div>
                          <div className="font-bold text-sm">{role.name}</div>
                          <div className="text-[10px] opacity-70 uppercase tracking-tight">
                            {role.permissions.length} 項權限標籤
                          </div>
                        </div>
                      </div>
                      {selectedRoleIds.includes(role.name) && (
                        <Check size={18} className="text-indigo-600" />
                      )}
                    </button>
                  ))
                )}
              </div>
              <div className="p-6 bg-slate-50 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-white transition-all"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                  儲存變更
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
