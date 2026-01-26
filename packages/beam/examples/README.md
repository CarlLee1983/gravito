# Beam 整合範例

這個目錄包含 `@gravito/beam` 與常見 React 資料獲取庫的整合範例。

## 📁 檔案說明

| 檔案 | 說明 | 依賴 |
|------|------|------|
| `react-query.ts` | React Query (TanStack Query) 整合 | `@tanstack/react-query` |
| `swr.ts` | SWR 整合 | `swr` |

## 🚀 使用方式

### 1. React Query 整合

React Query 提供強大的伺服器狀態管理功能，包括自動背景重新獲取、快取管理和樂觀更新。

**安裝依賴**：
```bash
bun add @tanstack/react-query
```

**基本設定**：
```tsx
// app.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
    </QueryClientProvider>
  )
}
```

**使用範例**：
```tsx
import { useUser, useCreateUser } from './examples/react-query'

function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading, error } = useUser(userId)

  if (isLoading) return <div>載入中...</div>
  if (error) return <div>錯誤：{error.message}</div>

  return <div>使用者：{data?.name}</div>
}

function CreateUserForm() {
  const createUser = useCreateUser()

  const handleSubmit = async (data: CreateUserInput) => {
    await createUser.mutateAsync(data)
    alert('使用者已創建！')
  }

  return (
    <form onSubmit={handleSubmit}>
      {createUser.isPending && <div>建立中...</div>}
      {createUser.error && <div>錯誤：{createUser.error.message}</div>}
      {/* 表單欄位 */}
    </form>
  )
}
```

### 2. SWR 整合

SWR 是由 Vercel 開發的輕量級資料獲取庫，提供簡潔的 API 和出色的開發體驗。

**安裝依賴**：
```bash
bun add swr
```

**基本設定**：
```tsx
// app.tsx
import { SWRConfig } from 'swr'

function App() {
  return (
    <SWRConfig
      value={{
        refreshInterval: 3000,
        revalidateOnFocus: true
      }}
    >
      <YourApp />
    </SWRConfig>
  )
}
```

**使用範例**：
```tsx
import { useUser, useCreateUser } from './examples/swr'

function UserProfile({ userId }: { userId: string }) {
  const { data, error, isLoading } = useUser(userId)

  if (isLoading) return <div>載入中...</div>
  if (error) return <div>錯誤：{error.message}</div>

  return <div>使用者：{data?.name}</div>
}

function CreateUserForm() {
  const { trigger, isMutating, error } = useCreateUser()
  const { mutate } = useUsers() // 用於重新驗證

  const handleSubmit = async (data: CreateUserInput) => {
    await trigger(data)
    mutate() // 重新獲取使用者列表
    alert('使用者已創建！')
  }

  return (
    <form onSubmit={handleSubmit}>
      {isMutating && <div>建立中...</div>}
      {error && <div>錯誤：{error.message}</div>}
      {/* 表單欄位 */}
    </form>
  )
}
```

## 💡 最佳實踐

### 1. 類型安全

確保從後端正確匯入 `AppRoutes` 類型：

```typescript
// ✅ 正確：使用 type-only import
import type { AppRoutes } from '../server/types'

// ❌ 錯誤：會包含執行時程式碼
import { AppRoutes } from '../server/types'
```

### 2. 錯誤處理

使用 `unwrapResponse` 或 `safeResponse`：

```typescript
// 拋出錯誤的方式（適合與 React Query/SWR 錯誤邊界配合）
const data = await unwrapResponse<User>(res)

// 不拋出錯誤的方式（適合需要明確處理錯誤的場景）
const { data, error } = await safeResponse<User>(res)
if (error) {
  console.error('Request failed:', error.message)
  return
}
```

### 3. 快取失效

**React Query**：
```typescript
// 使特定查詢失效
queryClient.invalidateQueries({ queryKey: ['users'] })

// 更新特定快取
queryClient.setQueryData(['user', userId], newData)

// 移除快取
queryClient.removeQueries({ queryKey: ['user', userId] })
```

**SWR**：
```typescript
// 重新驗證特定查詢
mutate(['users'])

// 使用 useSWRConfig 全域重新驗證
import { useSWRConfig } from 'swr'
const { mutate } = useSWRConfig()
mutate(['users'])
```

### 4. 樂觀更新

**React Query**：
```typescript
const updateUser = useMutation({
  mutationFn: async ({ userId, data }) => {
    // API 呼叫
  },
  onMutate: async ({ userId, data }) => {
    // 取消進行中的查詢
    await queryClient.cancelQueries({ queryKey: ['user', userId] })

    // 保存舊資料
    const previousUser = queryClient.getQueryData(['user', userId])

    // 樂觀更新
    queryClient.setQueryData(['user', userId], data)

    return { previousUser }
  },
  onError: (_err, _variables, context) => {
    // 回滾
    if (context?.previousUser) {
      queryClient.setQueryData(['user', userId], context.previousUser)
    }
  }
})
```

**SWR**：
```typescript
const { trigger } = useSWRMutation(
  ['user', userId],
  async (_key, { arg }) => {
    // API 呼叫
  },
  {
    optimisticData: (current) => ({ ...current, ...arg }),
    rollbackOnError: true
  }
)
```

## 🔗 相關資源

- [React Query 文件](https://tanstack.com/query/latest)
- [SWR 文件](https://swr.vercel.app/)
- [Gravito Beam 文件](../README.md)
