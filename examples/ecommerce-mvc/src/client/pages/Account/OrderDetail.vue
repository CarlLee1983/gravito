<script lang="ts">
import Layout from '../../components/Layout.vue'
export default { layout: Layout }
</script>

<script setup lang="ts">
import { ref } from 'vue'
import { Head, Link, router } from '@inertiajs/vue3'

const props = defineProps<{
  order: {
    id: number
    order_number: string
    status: string
    status_label: string
    subtotal: number
    tax: number
    shipping: number
    total: number
    formatted_total: string
    shipping_address: any
    notes: string | null
    created_at: string
    items: Array<{
      product_name: string
      quantity: number
      price: number
      line_total: number
    }>
  }
}>()

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-orange-100 text-orange-800',
}

const isPaying = ref(false)

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
  }).format(price / 100)
}

const handlePay = () => {
  isPaying.value = true
  
  // Get CSRF from cookie
  const csrfToken = decodeURIComponent(
    document.cookie
      .split('; ')
      .find(row => row.startsWith('XSRF-TOKEN='))
      ?.split('=')[1] || ''
  )

  fetch(`/account/orders/${props.order.id}/pay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-XSRF-TOKEN': csrfToken
    }
  })
  .then(res => res.json())
  .then(data => {
    if (data.checkout_url) {
      window.location.href = data.checkout_url
    } else {
      alert(data.error || '無法發起支付')
      isPaying.value = false
    }
  })
  .catch(err => {
    console.error('Payment error:', err)
    alert('網路錯誤，請稍後再試')
    isPaying.value = false
  })
}
</script>

<template>
  <Head :title="`訂單詳情 #${order.order_number}`" />

  <div class="container py-8">
    <div class="flex items-center gap-4 mb-8">
      <Link href="/account/orders" class="btn btn-ghost btn-sm px-2">
        <span class="i-heroicons-arrow-left text-xl"></span>
      </Link>
      <h1 class="heading-1 border-none bg-transparent p-0 m-0">訂單詳情</h1>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Main Content -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Order Status -->
        <div class="card p-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <p class="text-sm text-gray-500 mb-1">訂單編號</p>
              <p class="font-mono font-bold">{{ order.order_number }}</p>
            </div>
            <div class="text-right">
              <p class="text-sm text-gray-500 mb-1">下單日期</p>
              <p>{{ new Date(order.created_at).toLocaleString('zh-TW') }}</p>
            </div>
          </div>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span :class="['badge', statusColors[order.status]]">
                {{ order.status_label }}
              </span>
            </div>
            
            <!-- Pay Now Button -->
            <button 
              v-if="order.status === 'pending'" 
              @click="handlePay"
              :disabled="isPaying"
              class="btn btn-primary btn-sm flex items-center gap-2"
            >
              <span v-if="isPaying" class="i-heroicons-arrow-path animate-spin text-lg"></span>
              <span v-else class="i-heroicons-credit-card text-lg"></span>
              {{ isPaying ? '跳轉中...' : '立即付款' }}
            </button>
          </div>
        </div>

        <!-- Order Items -->
        <div class="card overflow-hidden">
          <div class="p-4 border-b bg-gray-50 dark:bg-gray-800">
            <h2 class="font-bold">訂單項目</h2>
          </div>
          <div class="divide-y border-gray-100 dark:border-gray-700">
            <div 
              v-for="item in order.items" 
              :key="item.product_name" 
              class="p-4 flex justify-between items-center"
            >
              <div>
                <p class="font-medium">{{ item.product_name }}</p>
                <p class="text-sm text-gray-500">
                  {{ formatPrice(item.price) }} × {{ item.quantity }}
                </p>
              </div>
              <p class="font-bold">{{ formatPrice(item.line_total) }}</p>
            </div>
          </div>
          <div class="p-4 bg-gray-50 dark:bg-gray-800 space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">小計</span>
              <span>{{ formatPrice(order.subtotal) }}</span>
            </div>
            <div v-if="order.tax > 0" class="flex justify-between text-sm">
              <span class="text-gray-500">稅金</span>
              <span>{{ formatPrice(order.tax) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">運費</span>
              <span>{{ formatPrice(order.shipping) }}</span>
            </div>
            <div class="flex justify-between text-xl font-bold pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
              <span>總計</span>
              <span class="price">{{ order.formatted_total }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Sidebar -->
      <div class="space-y-6">
        <!-- Shipping Address -->
        <div class="card p-6">
          <h2 class="font-bold mb-4 flex items-center gap-2">
            <span class="i-heroicons-truck text-primary"></span>
            收件資訊
          </h2>
          <div class="text-sm space-y-1">
            <p class="font-medium text-base mb-2">{{ order.shipping_address.name }}</p>
            <p class="text-gray-600 dark:text-gray-400">{{ order.shipping_address.phone }}</p>
            <p class="text-gray-600 dark:text-gray-400">
              {{ order.shipping_address.city }}{{ order.shipping_address.district }}{{ order.shipping_address.address }}
            </p>
            <p class="text-gray-400 mt-2" v-if="order.notes">備註: {{ order.notes }}</p>
          </div>
        </div>

        <!-- Support Info -->
        <div class="card p-6 bg-primary-50 dark:bg-primary-900 border-primary-200 text-center">
          <span class="i-heroicons-question-mark-circle text-4xl text-primary mx-auto mb-2"></span>
          <h3 class="font-bold mb-2">需要協助？</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            如果您對此訂單有任何問題，請隨時與我們聯繫。
          </p>
          <a href="#" class="btn btn-outline btn-primary btn-sm w-full">聯繫客服</a>
        </div>
      </div>
    </div>
  </div>
</template>
