<script setup lang="ts">
import AdminLayout from '../../components/AdminLayout.vue'

defineOptions({ layout: AdminLayout })

defineProps<{
  stats: {
    totalProducts: number
    totalOrders: number
    totalUsers: number
    totalRevenue: number
    todayOrders: number
    todayRevenue: number
  }
  recentOrders: any[]
  ordersByStatus: Record<string, number>
}>()

const formatPrice = (price: number) => `NT$ ${(price / 100).toLocaleString()}`

const statusLabels: Record<string, string> = {
  pending: '待付款',
  paid: '已付款',
  processing: '處理中',
  shipped: '已出貨',
  delivered: '已送達',
  cancelled: '已取消',
  refunded: '已退款',
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-orange-100 text-orange-800',
}
</script>

<template>
  <Head title="後台管理" />

  <div>
    <h1 class="heading-1 mb-8">儀表板</h1>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="card p-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <span class="i-heroicons-cube text-2xl text-blue-600"></span>
          </div>
          <div>
            <p class="text-sm text-gray-500">商品數量</p>
            <p class="text-2xl font-bold">{{ stats.totalProducts }}</p>
          </div>
        </div>
      </div>

      <div class="card p-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <span class="i-heroicons-shopping-bag text-2xl text-green-600"></span>
          </div>
          <div>
            <p class="text-sm text-gray-500">總訂單數</p>
            <p class="text-2xl font-bold">{{ stats.totalOrders }}</p>
          </div>
        </div>
      </div>

      <div class="card p-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <span class="i-heroicons-users text-2xl text-purple-600"></span>
          </div>
          <div>
            <p class="text-sm text-gray-500">會員數量</p>
            <p class="text-2xl font-bold">{{ stats.totalUsers }}</p>
          </div>
        </div>
      </div>

      <div class="card p-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
            <span class="i-heroicons-currency-dollar text-2xl text-yellow-600"></span>
          </div>
          <div>
            <p class="text-sm text-gray-500">總營收</p>
            <p class="text-2xl font-bold">{{ formatPrice(stats.totalRevenue) }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Recent Orders -->
      <div class="card p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="heading-3">最新訂單</h2>
          <Link href="/admin/orders" class="text-primary text-sm hover:underline">查看全部</Link>
        </div>

        <div class="space-y-4">
          <div v-for="order in recentOrders" :key="order.id" class="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
            <div>
              <p class="font-mono text-sm">{{ order.order_number }}</p>
              <p class="text-sm text-gray-500">{{ order.user_name }}</p>
            </div>
            <div class="text-right">
              <p class="font-bold price">{{ formatPrice(order.total) }}</p>
              <span :class="['badge text-xs', statusColors[order.status]]">
                {{ statusLabels[order.status] }}
              </span>
            </div>
          </div>
          <p v-if="recentOrders.length === 0" class="text-gray-500 text-center py-4">尚無訂單</p>
        </div>
      </div>

      <!-- Orders by Status -->
      <div class="card p-6">
        <h2 class="heading-3 mb-4">訂單狀態分布</h2>

        <div class="space-y-3">
          <div v-for="(count, status) in ordersByStatus" :key="status" class="flex items-center gap-3">
            <span :class="['badge', statusColors[status]]">{{ statusLabels[status] }}</span>
            <div class="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
              <div
                class="bg-primary rounded-full h-2"
                :style="{ width: `${(count / stats.totalOrders) * 100}%` }"
              ></div>
            </div>
            <span class="text-sm font-medium">{{ count }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
