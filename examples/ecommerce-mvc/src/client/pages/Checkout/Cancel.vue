<script setup lang="ts">
import Layout from '../../components/Layout.vue'

defineOptions({ layout: Layout })
</script>

<template>
  <Head title="付款取消" />

  <div class="container py-16 text-center">
    <div class="max-w-lg mx-auto">
      <div class="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <span class="i-heroicons-exclamation-circle text-4xl text-yellow-600"></span>
      </div>

      <h1 class="heading-1 mb-4">付款已取消</h1>
      <p class="text-xl text-gray-600 dark:text-gray-400 mb-8">
        您的付款流程已取消，購物車內的商品仍保留著。
      </p>

      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <Link href="/cart" class="btn btn-primary">
          返回購物車
        </Link>
        <Link href="/products" class="btn btn-outline">
          繼續購物
        </Link>
      </div>
    </div>
  </div>
</template>
