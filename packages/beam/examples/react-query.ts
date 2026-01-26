/**
 * React Query 整合範例
 *
 * 本範例展示如何將 @gravito/beam 與 @tanstack/react-query 整合，
 * 實現類型安全的資料獲取和快取管理。
 *
 * @example
 * 安裝依賴：
 * ```bash
 * bun add @tanstack/react-query
 * bun add @gravito/beam
 * ```
 */

import { createBeam, safeResponse, unwrapResponse } from '@gravito/beam'
import type { UseMutationOptions, UseQueryOptions } from '@tanstack/react-query'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// ==================== 類型定義 ====================

/**
 * 從你的後端 server 匯入 AppRoutes 類型
 *
 * @example
 * ```typescript
 * // server/types.ts
 * export type { AppRoutes } from './app'
 * ```
 */
// import type { AppRoutes } from '../server/types'

// 為了範例，我們使用 any，實際使用時請替換為真實類型
type AppRoutes = any

// ==================== 客戶端設定 ====================

/**
 * 創建全域的 Beam 客戶端實例
 */
export const client = createBeam<AppRoutes>('http://localhost:3000', {
  // 認證 token
  headers: () => {
    const token = localStorage.getItem('authToken')
    return token ? { Authorization: `Bearer ${token}` } : {}
  },

  // 超時設定
  timeout: 10000,

  // 重試設定
  retry: {
    count: 2,
    delay: 1000,
    statusCodes: [408, 429, 500, 502, 503, 504],
  },
})

// ==================== Query Hooks ====================

/**
 * 查詢使用者資料
 *
 * @example
 * ```tsx
 * function UserProfile({ userId }: { userId: string }) {
 *   const { data, isLoading, error } = useUser(userId)
 *
 *   if (isLoading) return <div>載入中...</div>
 *   if (error) return <div>錯誤：{error.message}</div>
 *
 *   return <div>使用者：{data?.name}</div>
 * }
 * ```
 */
export function useUser(userId: string, options?: UseQueryOptions<User, Error>) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const res = await client.api.users[':id'].$get({ param: { id: userId } })
      return unwrapResponse<User>(res)
    },
    ...options,
  })
}

/**
 * 查詢使用者列表
 *
 * @example
 * ```tsx
 * function UserList() {
 *   const { data, isLoading } = useUsers()
 *
 *   if (isLoading) return <div>載入中...</div>
 *
 *   return (
 *     <ul>
 *       {data?.map(user => (
 *         <li key={user.id}>{user.name}</li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 */
export function useUsers(options?: UseQueryOptions<User[], Error>) {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await client.api.users.$get()
      return unwrapResponse<User[]>(res)
    },
    ...options,
  })
}

/**
 * 使用 safeResponse 的查詢範例
 *
 * 這種方式不會拋出錯誤，而是將錯誤包含在回傳值中
 *
 * @example
 * ```tsx
 * function SafeUserProfile({ userId }: { userId: string }) {
 *   const { data: result } = useSafeUser(userId)
 *
 *   if (result?.error) {
 *     return <div>錯誤：{result.error.message}</div>
 *   }
 *
 *   return <div>使用者：{result?.data?.name}</div>
 * }
 * ```
 */
export function useSafeUser(userId: string, options?: UseQueryOptions<SafeResult<User>, never>) {
  return useQuery({
    queryKey: ['user', 'safe', userId],
    queryFn: async () => {
      const res = await client.api.users[':id'].$get({ param: { id: userId } })
      return safeResponse<User>(res)
    },
    ...options,
  })
}

// ==================== Mutation Hooks ====================

/**
 * 創建使用者
 *
 * @example
 * ```tsx
 * function CreateUserForm() {
 *   const createUser = useCreateUser()
 *
 *   const handleSubmit = async (data: CreateUserInput) => {
 *     await createUser.mutateAsync(data)
 *     alert('使用者已創建！')
 *   }
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       {createUser.isPending && <div>建立中...</div>}
 *       {createUser.error && <div>錯誤：{createUser.error.message}</div>}
 *     </form>
 *   )
 * }
 * ```
 */
export function useCreateUser(options?: UseMutationOptions<User, Error, CreateUserInput>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      const res = await client.api.users.$post({ json: input })
      return unwrapResponse<User>(res)
    },
    onSuccess: () => {
      // 使清單快取失效，觸發重新獲取
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    ...options,
  })
}

/**
 * 更新使用者
 *
 * @example
 * ```tsx
 * function UpdateUserForm({ userId }: { userId: string }) {
 *   const updateUser = useUpdateUser()
 *   const { data: user } = useUser(userId)
 *
 *   const handleSubmit = async (data: UpdateUserInput) => {
 *     await updateUser.mutateAsync({ userId, data })
 *     alert('使用者已更新！')
 *   }
 *
 *   return <form onSubmit={handleSubmit}>...</form>
 * }
 * ```
 */
export function useUpdateUser(
  options?: UseMutationOptions<User, Error, { userId: string; data: UpdateUserInput }>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, data }) => {
      const res = await client.api.users[':id'].$put({
        param: { id: userId },
        json: data,
      })
      return unwrapResponse<User>(res)
    },
    onSuccess: (data, variables) => {
      // 更新特定使用者的快取
      queryClient.setQueryData(['user', variables.userId], data)
      // 使列表快取失效
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    ...options,
  })
}

/**
 * 刪除使用者
 *
 * @example
 * ```tsx
 * function DeleteUserButton({ userId }: { userId: string }) {
 *   const deleteUser = useDeleteUser()
 *
 *   const handleDelete = async () => {
 *     if (confirm('確定要刪除？')) {
 *       await deleteUser.mutateAsync(userId)
 *       alert('使用者已刪除！')
 *     }
 *   }
 *
 *   return (
 *     <button onClick={handleDelete} disabled={deleteUser.isPending}>
 *       {deleteUser.isPending ? '刪除中...' : '刪除'}
 *     </button>
 *   )
 * }
 * ```
 */
export function useDeleteUser(options?: UseMutationOptions<void, Error, string>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await client.api.users[':id'].$delete({
        param: { id: userId },
      })
      await unwrapResponse<void>(res)
    },
    onSuccess: (_data, userId) => {
      // 移除特定使用者的快取
      queryClient.removeQueries({ queryKey: ['user', userId] })
      // 使列表快取失效
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    ...options,
  })
}

// ==================== 類型輔助 ====================

/**
 * safeResponse 的回傳類型
 */
type SafeResult<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string; status?: number; code?: string } }

/**
 * 使用者類型（範例）
 */
interface User {
  id: string
  name: string
  email: string
  createdAt: string
}

/**
 * 創建使用者輸入（範例）
 */
interface CreateUserInput {
  name: string
  email: string
  password: string
}

/**
 * 更新使用者輸入（範例）
 */
interface UpdateUserInput {
  name?: string
  email?: string
}
