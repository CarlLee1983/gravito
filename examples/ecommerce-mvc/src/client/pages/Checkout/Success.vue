<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3'
import Layout from '../../components/Layout.vue'

defineOptions({ layout: Layout })

defineProps<{
  order: {
    id: number
    order_number: string
    status_label: string
    formatted_total: string
    items: any[]
  }
}>()
</script>

<template>
  <Head title="訂單成功" />

  <div class="container py-16 text-center">
    <div class="max-w-lg mx-auto">
      <!-- Success Icon -->
      <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <span class="i-heroicons-check text-4xl text-green-600"></span>
      </div>

      <h1 class="heading-1 mb-4">付款成功！</h1>
      <p class="text-xl text-gray-600 dark:text-gray-400 mb-8">
        感謝您的購買，我們將盡快為您出貨。
      </p>

      <div class="card p-6 text-left mb-8">
        <div class="flex justify-between items-start mb-4">
          <div>
            <p class="text-sm text-gray-500">訂單編號</p>
            <p class="font-mono font-bold">{{ order.order_number }}</p>
          </div>
          <span class="badge badge-success">{{ order.status_label }}</span>
        </div>

        <hr class="border-gray-200 dark:border-gray-700 my-4">

        <div class="space-y-2">
          <div v-for="item in order.items" :key="item.product_name" class="flex justify-between text-sm">
            <span>{{ item.product_name }} x{{ item.quantity }}</span>
            <span class="price">NT$ {{ (item.price * item.quantity / 100).toLocaleString() }}</span>
          </div>
        </div>

        <hr class="border-gray-200 dark:border-gray-700 my-4">

        <div class="flex justify-between font-bold">
          <span>總計</span>
          <span class="text-primary">{{ order.formatted_total }}</span>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <Link href="/account/orders" class="btn btn-primary">
          查看訂單
        </Link>
        <Link href="/products" class="btn btn-outline">
          繼續購物
        </Link>
      </div>
    </div>
  </div>
</template>
