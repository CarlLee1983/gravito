<script setup lang="ts">
import { ref } from 'vue'
import { Head, Link, router } from '@inertiajs/vue3'
import AdminLayout from '../../../components/AdminLayout.vue'

defineOptions({ layout: AdminLayout })

const props = defineProps<{
  users: any[]
  filters: { search: string; role: string }
  pagination: { page: number; perPage: number; total: number; totalPages: number }
}>()

const search = ref(props.filters.search || '')
const role = ref(props.filters.role || '')

const formatPrice = (price: number) => `NT$ ${(price / 100).toLocaleString()}`

const doSearch = () => {
  router.get('/admin/users', { search: search.value, role: role.value }, { preserveState: true })
}

const toggleActive = async (userId: number) => {
  try {
    const response = await fetch(`/admin/users/${userId}/toggle-active`, {
      method: 'POST',
    })
    const data = await response.json()

    if (data.error) {
      alert(data.error)
      return
    }

    router.reload()
  } catch (error) {
    alert('操作失敗')
  }
}

const roleLabels: Record<string, string> = {
  admin: '管理員',
  user: '一般用戶',
}
</script>

<template>
  <Head title="用戶管理" />

  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="heading-1">用戶管理</h1>
    </div>

    <!-- Search & Filter -->
    <div class="card p-4 mb-6">
      <form @submit.prevent="doSearch" class="flex gap-4">
        <input
          v-model="search"
          type="text"
          placeholder="搜尋用戶名稱或 Email..."
          class="input flex-1"
        />
        <select v-model="role" class="input w-40">
          <option value="">全部角色</option>
          <option value="admin">管理員</option>
          <option value="user">一般用戶</option>
        </select>
        <button type="submit" class="btn btn-primary">搜尋</button>
      </form>
    </div>

    <!-- Users Table -->
    <div class="card overflow-hidden">
      <table class="w-full">
        <thead class="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th class="px-6 py-3 text-left text-sm font-medium">用戶</th>
            <th class="px-6 py-3 text-left text-sm font-medium">角色</th>
            <th class="px-6 py-3 text-left text-sm font-medium">訂單數</th>
            <th class="px-6 py-3 text-left text-sm font-medium">消費總額</th>
            <th class="px-6 py-3 text-left text-sm font-medium">註冊時間</th>
            <th class="px-6 py-3 text-left text-sm font-medium">狀態</th>
            <th class="px-6 py-3 text-right text-sm font-medium">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
          <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50 dark:hover:bg-gray-800">
            <td class="px-6 py-4">
              <div>
                <div class="font-medium">{{ user.name }}</div>
                <div class="text-sm text-gray-500">{{ user.email }}</div>
              </div>
            </td>
            <td class="px-6 py-4">
              <span :class="user.role === 'admin' ? 'badge badge-primary' : 'badge badge-secondary'">
                {{ roleLabels[user.role] || user.role }}
              </span>
            </td>
            <td class="px-6 py-4 text-sm">{{ user.order_count }}</td>
            <td class="px-6 py-4 font-medium price">{{ formatPrice(user.total_spent) }}</td>
            <td class="px-6 py-4 text-sm text-gray-500">
              {{ new Date(user.created_at).toLocaleDateString('zh-TW') }}
            </td>
            <td class="px-6 py-4">
              <span :class="user.is_active ? 'badge badge-success' : 'badge badge-danger'">
                {{ user.is_active ? '啟用' : '停用' }}
              </span>
            </td>
            <td class="px-6 py-4 text-right">
              <Link :href="`/admin/users/${user.id}`" class="btn btn-sm btn-ghost">查看</Link>
              <button
                v-if="user.role !== 'admin'"
                @click="toggleActive(user.id)"
                class="btn btn-sm btn-ghost"
                :class="user.is_active ? 'text-red-500' : 'text-green-500'"
              >
                {{ user.is_active ? '停用' : '啟用' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="users.length === 0" class="p-8 text-center text-gray-500">
        尚無用戶
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="pagination.totalPages > 1" class="flex justify-center gap-2 mt-6">
      <Link
        v-for="p in pagination.totalPages"
        :key="p"
        :href="`/admin/users?page=${p}&search=${filters.search}&role=${filters.role}`"
        :class="['btn btn-sm', p === pagination.page ? 'btn-primary' : 'btn-ghost']"
      >
        {{ p }}
      </Link>
    </div>
  </div>
</template>
