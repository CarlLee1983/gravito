<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3'
import Layout from '../../components/Layout.vue'

defineOptions({ layout: Layout })

defineProps<{
  orders: any[]
  pagination: { page: number; total: number; totalPages: number }
}>()

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
  <Head title="訂單紀錄" />

  <div class="container py-8">
    <h1 class="heading-1 mb-8">訂單紀錄</h1>

    <div v-if="orders.length > 0" class="space-y-4">
      <Link
        v-for="order in orders"
        :key="order.id"
        :href="`/account/orders/${order.id}`"
        class="card p-6 block hover:shadow-lg transition-shadow"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="font-mono text-sm text-gray-500">{{ order.order_number }}</p>
            <p class="font-bold text-lg price mt-1">{{ order.formatted_total }}</p>
          </div>
          <div class="text-right">
            <span :class="['badge', statusColors[order.status]]">{{ order.status_label }}</span>
            <p class="text-sm text-gray-500 mt-2">
              {{ new Date(order.created_at).toLocaleDateString('zh-TW') }}
            </p>
          </div>
        </div>
      </Link>
    </div>

    <div v-else class="text-center py-16">
      <span class="i-heroicons-shopping-bag text-6xl text-gray-300 mx-auto mb-4"></span>
      <h2 class="heading-2 mb-2">尚無訂單</h2>
      <p class="text-gray-500 mb-6">開始購物吧！</p>
      <Link href="/products" class="btn btn-primary">探索商品</Link>
    </div>

    <!-- Pagination -->
    <div v-if="pagination.totalPages > 1" class="flex justify-center gap-2 mt-8">
      <Link
        v-for="p in pagination.totalPages"
        :key="p"
        :href="`/account/orders?page=${p}`"
        :class="['btn btn-sm', p === pagination.page ? 'btn-primary' : 'btn-ghost']"
      >
        {{ p }}
      </Link>
    </div>
  </div>
</template>
