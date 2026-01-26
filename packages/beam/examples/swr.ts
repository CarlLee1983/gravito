/**
 * SWR 整合範例
 *
 * 本範例展示如何將 @gravito/beam 與 SWR 整合，
 * 實現類型安全的資料獲取和快取管理。
 *
 * @example
 * 安裝依賴：
 * ```bash
 * bun add swr
 * bun add @gravito/beam
 * ```
 */

import { createBeam, safeResponse, unwrapResponse } from '@gravito/beam'
import type { SWRConfiguration, SWRResponse } from 'swr'
import useSWR from 'swr'
import type { SWRMutationConfiguration } from 'swr/mutation'
import useSWRMutation from 'swr/mutation'

// ==================== 類型定義 ====================

/**
 * 從你的後端 server 匯入 AppRoutes 類型
 */
// import type { AppRoutes } from '../server/types'

// 為了範例，我們使用 any，實際使用時請替換為真實類型
type AppRoutes = any

// ==================== 客戶端設定 ====================

/**
 * 創建全域的 Beam 客戶端實例
 */
export const client = createBeam<AppRoutes>('http://localhost:3000', {
  headers: () => {
    const token = localStorage.getItem('authToken')
    return token ? { Authorization: `Bearer ${token}` } : {}
  },
  timeout: 10000,
  retry: {
    count: 2,
    delay: 1000,
  },
})

// ==================== SWR Hooks ====================

/**
 * 查詢使用者資料
 *
 * @example
 * ```tsx
 * function UserProfile({ userId }: { userId: string }) {
 *   const { data, error, isLoading } = useUser(userId)
 *
 *   if (isLoading) return <div>載入中...</div>
 *   if (error) return <div>錯誤：{error.message}</div>
 *
 *   return <div>使用者：{data?.name}</div>
 * }
 * ```
 */
export function useUser(
  userId: string | null,
  config?: SWRConfiguration<User, Error>
): SWRResponse<User, Error> {
  return useSWR(
    userId ? ['user', userId] : null,
    async () => {
      const res = await client.api.users[':id'].$get({
        param: { id: userId! },
      })
      return unwrapResponse<User>(res)
    },
    config
  )
}

/**
 * 查詢使用者列表
 *
 * @example
 * ```tsx
 * function UserList() {
 *   const { data, error } = useUsers()
 *
 *   if (error) return <div>錯誤：{error.message}</div>
 *   if (!data) return <div>載入中...</div>
 *
 *   return (
 *     <ul>
 *       {data.map(user => (
 *         <li key={user.id}>{user.name}</li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 */
export function useUsers(config?: SWRConfiguration<User[], Error>): SWRResponse<User[], Error> {
  return useSWR(
    'users',
    async () => {
      const res = await client.api.users.$get()
      return unwrapResponse<User[]>(res)
    },
    config
  )
}

/**
 * 使用 safeResponse 的查詢範例
 *
 * @example
 * ```tsx
 * function SafeUserProfile({ userId }: { userId: string }) {
 *   const { data } = useSafeUser(userId)
 *
 *   if (data?.error) {
 *     return <div>錯誤：{data.error.message}</div>
 *   }
 *
 *   return <div>使用者：{data?.data?.name}</div>
 * }
 * ```
 */
export function useSafeUser(
  userId: string | null,
  config?: SWRConfiguration<SafeResult<User>, never>
): SWRResponse<SafeResult<User>, never> {
  return useSWR(
    userId ? ['user', 'safe', userId] : null,
    async () => {
      const res = await client.api.users[':id'].$get({
        param: { id: userId! },
      })
      return safeResponse<User>(res)
    },
    config
  )
}

// ==================== SWR Mutation Hooks ====================

/**
 * 創建使用者
 *
 * @example
 * ```tsx
 * function CreateUserForm() {
 *   const { trigger, isMutating, error } = useCreateUser()
 *   const { mutate } = useUsers() // 用於重新驗證
 *
 *   const handleSubmit = async (data: CreateUserInput) => {
 *     await trigger(data)
 *     mutate() // 重新獲取使用者列表
 *     alert('使用者已創建！')
 *   }
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       {isMutating && <div>建立中...</div>}
 *       {error && <div>錯誤：{error.message}</div>}
 *     </form>
 *   )
 * }
 * ```
 */
export function useCreateUser(
  config?: SWRMutationConfiguration<User, Error, string, CreateUserInput>
) {
  return useSWRMutation(
    'users',
    async (_key, { arg }: { arg: CreateUserInput }) => {
      const res = await client.api.users.$post({ json: arg })
      return unwrapResponse<User>(res)
    },
    config
  )
}

/**
 * 更新使用者
 *
 * @example
 * ```tsx
 * function UpdateUserForm({ userId }: { userId: string }) {
 *   const { trigger, isMutating } = useUpdateUser(userId)
 *   const { mutate } = useUser(userId) // 用於重新驗證
 *
 *   const handleSubmit = async (data: UpdateUserInput) => {
 *     await trigger(data)
 *     mutate() // 重新獲取使用者資料
 *     alert('使用者已更新！')
 *   }
 *
 *   return <form onSubmit={handleSubmit}>...</form>
 * }
 * ```
 */
export function useUpdateUser(
  userId: string,
  config?: SWRMutationConfiguration<User, Error, ['user', string], UpdateUserInput>
) {
  return useSWRMutation(
    ['user', userId],
    async (_key, { arg }: { arg: UpdateUserInput }) => {
      const res = await client.api.users[':id'].$put({
        param: { id: userId },
        json: arg,
      })
      return unwrapResponse<User>(res)
    },
    config
  )
}

/**
 * 刪除使用者
 *
 * @example
 * ```tsx
 * function DeleteUserButton({ userId }: { userId: string }) {
 *   const { trigger, isMutating } = useDeleteUser(userId)
 *   const { mutate } = useUsers() // 用於重新驗證列表
 *
 *   const handleDelete = async () => {
 *     if (confirm('確定要刪除？')) {
 *       await trigger()
 *       mutate() // 重新獲取使用者列表
 *       alert('使用者已刪除！')
 *     }
 *   }
 *
 *   return (
 *     <button onClick={handleDelete} disabled={isMutating}>
 *       {isMutating ? '刪除中...' : '刪除'}
 *     </button>
 *   )
 * }
 * ```
 */
export function useDeleteUser(
  userId: string,
  config?: SWRMutationConfiguration<void, Error, ['user', string], void>
) {
  return useSWRMutation(
    ['user', userId],
    async () => {
      const res = await client.api.users[':id'].$delete({
        param: { id: userId },
      })
      await unwrapResponse<void>(res)
    },
    config
  )
}

// ==================== 進階範例 ====================

/**
 * 帶分頁的使用者列表
 *
 * @example
 * ```tsx
 * function PaginatedUserList() {
 *   const [page, setPage] = useState(1)
 *   const { data, error } = usePaginatedUsers(page, 10)
 *
 *   return (
 *     <div>
 *       <ul>{data?.users.map(...)}</ul>
 *       <button onClick={() => setPage(p => p - 1)}>上一頁</button>
 *       <button onClick={() => setPage(p => p + 1)}>下一頁</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function usePaginatedUsers(
  page: number,
  limit: number,
  config?: SWRConfiguration<PaginatedResponse<User>, Error>
): SWRResponse<PaginatedResponse<User>, Error> {
  return useSWR(
    ['users', 'paginated', page, limit],
    async () => {
      const res = await client.api.users.$get({
        query: { page: page.toString(), limit: limit.toString() },
      })
      return unwrapResponse<PaginatedResponse<User>>(res)
    },
    {
      // 保留前一頁資料，避免閃爍
      keepPreviousData: true,
      ...config,
    }
  )
}

/**
 * 無限滾動使用者列表（使用 SWR Infinite）
 *
 * @example
 * ```tsx
 * import useSWRInfinite from 'swr/infinite'
 *
 * function InfiniteUserList() {
 *   const { data, size, setSize } = useInfiniteUsers(10)
 *
 *   const users = data?.flatMap(page => page.users) ?? []
 *
 *   return (
 *     <div>
 *       <ul>{users.map(user => ...)}</ul>
 *       <button onClick={() => setSize(size + 1)}>載入更多</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useInfiniteUsers(limit: number) {
  const { default: useSWRInfinite } = require('swr/infinite')

  return useSWRInfinite(
    (index: number) => ['users', 'infinite', index, limit],
    async ([_key, _type, page]) => {
      const res = await client.api.users.$get({
        query: { page: (page + 1).toString(), limit: limit.toString() },
      })
      return unwrapResponse<PaginatedResponse<User>>(res)
    }
  )
}

// ==================== 類型輔助 ====================

type SafeResult<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string; status?: number; code?: string } }

interface User {
  id: string
  name: string
  email: string
  createdAt: string
}

interface CreateUserInput {
  name: string
  email: string
  password: string
}

interface UpdateUserInput {
  name?: string
  email?: string
}

interface PaginatedResponse<T> {
  users: T[]
  total: number
  page: number
  limit: number
}
