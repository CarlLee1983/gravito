import {
  type AdminSdk,
  createAdminSdk,
  type IAdminModule,
  type IAdminUser,
  type IMenuNode,
} from '@gravito/admin-sdk'
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'

interface AdminContextType {
  sdk: AdminSdk
  user: IAdminUser | null
  isAuthenticated: boolean
  isLoading: boolean
  modules: IAdminModule[]
  menu: IMenuNode[]
  permissions: string[]
  login: (credentials: any) => Promise<void>
  logout: () => void
}

const AdminContext = createContext<AdminContextType | undefined>(undefined)

export function AdminProvider({
  children,
  baseUrl,
  modules = [],
}: {
  children: ReactNode
  baseUrl: string
  modules?: IAdminModule[]
}) {
  const sdk = useMemo(() => createAdminSdk({ baseUrl }), [baseUrl])

  const [user, setUser] = useState<IAdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 從模組中自動彙整選單並排序
  const menu = useMemo(() => {
    const allMenuNodes = modules.flatMap((m) => m.menu || [])
    return allMenuNodes.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
  }, [modules])

  const permissions = useMemo(() => user?.permissions || [], [user])
  const isAuthenticated = useMemo(() => !!user, [user])

  useEffect(() => {
    async function initAuth() {
      try {
        const currentUser = await sdk.auth.me()
        setUser(currentUser)
      } catch (error) {
        console.error('[AdminShell] Auth initialization failed', error)
      } finally {
        setIsLoading(false)
      }
    }
    initAuth()
  }, [sdk])

  const login = async (credentials: any) => {
    const loggedUser = await sdk.auth.login(credentials)
    setUser(loggedUser)
  }

  const logout = async () => {
    await sdk.auth.logout()
    setUser(null)
  }

  const value = {
    sdk,
    user,
    isAuthenticated,
    isLoading,
    modules,
    menu,
    permissions,
    login,
    logout,
  }

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

export function useAdmin() {
  const context = useContext(AdminContext)
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider')
  }
  return context
}
