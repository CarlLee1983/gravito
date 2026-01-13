<script setup lang="ts">
import { ref } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import Layout from '../../components/Layout.vue'
import GImage from '../../components/GImage.vue'

defineOptions({ layout: Layout })

defineProps<{
  products: any[]
  categories: any[]
  filters: { search: string; category: string; sort: string }
  pagination: { page: number; perPage: number; total: number; totalPages: number }
}>()

const search = ref('')
const category = ref('')
const sort = ref('latest')

const formatPrice = (price: number) => `NT$ ${(price / 100).toLocaleString()}`

const applyFilters = () => {
  router.get('/products', {
    search: search.value || undefined,
    category: category.value || undefined,
    sort: sort.value,
  }, { preserveState: true })
}
</script>

<template>
  <Head title="商品列表" />

  <div class="container py-8">
    <h1 class="heading-1 mb-6">全部商品</h1>

    <!-- Filters -->
    <div class="card p-4 mb-8">
      <form @submit.prevent="applyFilters" class="flex flex-wrap gap-4">
        <input
          v-model="search"
          type="text"
          placeholder="搜尋商品..."
          class="input flex-1 min-w-[200px]"
        />
        <select v-model="category" class="input w-40">
          <option value="">全部分類</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.slug">{{ cat.name }}</option>
        </select>
        <select v-model="sort" class="input w-40">
          <option value="latest">最新上架</option>
          <option value="price_asc">價格低到高</option>
          <option value="price_desc">價格高到低</option>
          <option value="name">名稱排序</option>
        </select>
        <button type="submit" class="btn btn-primary">篩選</button>
      </form>
    </div>

    <!-- Results -->
    <div v-if="products.length > 0">
      <p class="text-gray-500 mb-4">共 {{ pagination.total }} 件商品</p>

      <div class="product-grid">
        <a
          v-for="product in products"
          :key="product.id"
          :href="`/products/${product.slug}`"
          class="card card-hover product-card"
        >
          <div class="aspect-square bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <GImage
              v-if="product.image_url"
              :src="product.image_url"
              :alt="product.name"
              class="product-card-image"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
              <span class="i-heroicons-photo text-4xl"></span>
            </div>
          </div>
          <div class="p-4">
            <p class="text-sm text-gray-500 mb-1">{{ product.category_name }}</p>
            <h3 class="font-semibold mb-2 line-clamp-2">{{ product.name }}</h3>
            <div class="flex items-center gap-2">
              <span class="text-lg font-bold text-primary price">{{ formatPrice(product.price) }}</span>
              <span v-if="product.compare_at_price" class="text-sm price-old">
                {{ formatPrice(product.compare_at_price) }}
              </span>
            </div>
          </div>
        </a>
      </div>

      <!-- Pagination -->
      <div v-if="pagination.totalPages > 1" class="flex justify-center gap-2 mt-8">
        <a
          v-for="p in pagination.totalPages"
          :key="p"
          :href="`/products?page=${p}&search=${filters.search}&category=${filters.category}&sort=${filters.sort}`"
          :class="['btn btn-sm', p === pagination.page ? 'btn-primary' : 'btn-ghost']"
        >
          {{ p }}
        </a>
      </div>
    </div>

    <!-- Empty -->
    <div v-else class="text-center py-16">
      <span class="i-heroicons-magnifying-glass text-6xl text-gray-300 mx-auto mb-4"></span>
      <h2 class="heading-2 mb-2">找不到商品</h2>
      <p class="text-gray-500">請嘗試其他搜尋條件</p>
    </div>
  </div>
</template>
