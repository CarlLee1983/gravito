<script setup lang="ts">
import { Head, router } from '@inertiajs/vue3'
import { ref } from 'vue'
import GImage from '../../components/GImage.vue'
import Layout from '../../components/Layout.vue'

defineOptions({ layout: Layout })

defineProps<{
  query: string
  products: any[]
  pagination: { page: number; total: number; totalPages: number }
}>()

const search = ref('')

const formatPrice = (price: number) => `NT$ ${(price / 100).toLocaleString()}`

const doSearch = () => {
  router.get('/search', { q: search.value })
}
</script>

<template>
  <Head title="搜尋" />

  <div class="container py-8">
    <h1 class="heading-1 mb-6">搜尋商品</h1>

    <!-- Search Form -->
    <form @submit.prevent="doSearch" class="mb-8 flex gap-4">
      <input
        v-model="search"
        type="text"
        placeholder="輸入商品名稱..."
        class="input flex-1"
        autofocus
      />
      <button type="submit" class="btn btn-primary">
        <span class="i-heroicons-magnifying-glass"></span>
        搜尋
      </button>
    </form>

    <!-- Results -->
    <template v-if="query">
      <p class="text-gray-500 mb-4">
        「{{ query }}」找到 {{ pagination.total }} 件商品
      </p>

      <div v-if="products.length > 0" class="product-grid">
        <a
          v-for="product in products"
          :key="product.id"
          :href="`/products/${product.slug}`"
          class="card card-hover product-card"
        >
          <GImage
            v-if="product.image_url"
            :src="product.image_url"
            :alt="product.name"
          />
          <div v-else class="aspect-square bg-gray-100 dark:bg-gray-700 overflow-hidden w-full h-full flex items-center justify-center text-gray-400">
             <span class="i-heroicons-photo text-4xl"></span>
          </div>
          <div class="p-4">
            <p class="text-sm text-gray-500 mb-1">{{ product.category_name }}</p>
            <h3 class="font-semibold mb-2 line-clamp-2">{{ product.name }}</h3>
            <span class="text-lg font-bold text-primary price">{{ formatPrice(product.price) }}</span>
          </div>
        </a>
      </div>

      <div v-else class="text-center py-16">
        <span class="i-heroicons-face-frown text-6xl text-gray-300 mx-auto mb-4"></span>
        <h2 class="heading-2 mb-2">找不到相關商品</h2>
        <p class="text-gray-500">請嘗試其他關鍵字</p>
      </div>
    </template>

    <template v-else>
      <div class="text-center py-16">
        <span class="i-heroicons-magnifying-glass text-6xl text-gray-300 mx-auto mb-4"></span>
        <h2 class="heading-2 mb-2">開始搜尋</h2>
        <p class="text-gray-500">輸入關鍵字尋找您想要的商品</p>
      </div>
    </template>
  </div>
</template>
