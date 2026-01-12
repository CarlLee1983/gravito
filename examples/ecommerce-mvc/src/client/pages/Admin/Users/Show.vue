<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3'
import AdminLayout from '../../../components/AdminLayout.vue'

defineOptions({ layout: AdminLayout })

defineProps<{
  user: any
  orders: any[]
  stats: {
    total_orders: number
    total_spent: number
  }
}>()

const formatPrice = (price: number) => `NT$ ${(price / 100).toLocaleString()}`

const roleLabels: Record<string, string> = {
  admin: '管理員',
  user: '一般用戶',
}

const statusLabels: Record<string, string> = {
  pending: '待付款',
  paid: '已付款',
  processing: '處理中',
  shipped: '已出貨',
  delivered: '已送達',
  cancelled: '已取消',
  refunded: '已退款',
}

const getStatusClass = (status: string) => {
  const classes: Record<string, string> = {
    pending: 'badge-warning',
    paid: 'badge-info',
    processing: 'badge-info',
    shipped: 'badge-primary',
    delivered: 'badge-success',
    cancelled: 'badge-danger',
    refunded: 'badge-secondary',
  }
  return classes[status] || 'badge-secondary'
}
</script>

<template>
  <Head :title="`用戶 - ${user.name}`" />

  <div>
    <div class="flex items-center gap-4 mb-6">
      <Link href="/admin/users" class="btn btn-ghost">
        <span class="i-heroicons-arrow-left"></span>
        返回
      </Link>
      <h1 class="heading-1">用戶詳情</h1>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- User Info & Stats -->
      <div class="space-y-6">
        <!-- User Profile -->
        <div class="card p-6">
          <h2 class="heading-3 mb-4">基本資訊</h2>
          <div class="space-y-3">
            <div>
              <p class="text-sm text-gray-500">姓名</p>
              <p class="font-medium">{{ user.name }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500">Email</p>
              <p class="font-medium">{{ user.email }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500">角色</p>
              <span :class="['badge', user.role === 'admin' ? 'badge-primary' : 'badge-secondary']">
                {{ roleLabels[user.role] || user.role }}
              </span>
            </div>
            <div>
              <p class="text-sm text-gray-500">帳號狀態</p>
              <span :class="['badge', user.is_active ? 'badge-success' : 'badge-danger']">
                {{ user.is_active ? '啟用' : '停用' }}
              </span>
            </div>
            <div>
              <p class="text-sm text-gray-500">註冊時間</p>
              <p>{{ new Date(user.created_at).toLocaleString('zh-TW') }}</p>
            </div>
          </div>
        </div>

        <!-- Stats -->
        <div class="card p-6">
          <h2 class="heading-3 mb-4">統計資料</h2>
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-gray-500">訂單總數</span>
              <span class="text-2xl font-bold text-primary">{{ stats.total_orders }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-500">消費總額</span>
              <span class="text-xl font-bold price">{{ formatPrice(stats.total_spent) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Orders -->
      <div class="lg:col-span-2">
        <div class="card p-6">
          <h2 class="heading-3 mb-4">最近訂單</h2>
          
          <div v-if="orders.length > 0" class="space-y-3">
            <div
              v-for="order in orders"
              :key="order.id"
              class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div class="flex items-start justify-between mb-2">
                <div>
                  <Link
                    :href="`/admin/orders/${order.id}`"
                    class="font-mono font-medium text-primary hover:underline"
                  >
                    {{ order.order_number }}
                  </Link>
                  <p class="text-sm text-gray-500 mt-1">
                    {{ new Date(order.created_at).toLocaleString('zh-TW') }}
                  </p>
                </div>
                <span :class="['badge', getStatusClass(order.status)]">
                  {{ statusLabels[order.status] || order.status }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-500">訂單金額</span>
                <span class="font-bold price">{{ order.formatted_total }}</span>
              </div>
            </div>
          </div>

          <div v-else class="py-8 text-center text-gray-500">
            此用戶尚無訂單記錄
          </div>

          <div v-if="orders.length >= 10" class="mt-4 text-center">
            <p class="text-sm text-gray-500">僅顯示最近 10 筆訂單</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
