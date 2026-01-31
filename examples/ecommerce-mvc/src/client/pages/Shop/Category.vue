<script setup lang="ts">
import Layout from '../../components/Layout.vue'

defineOptions({ layout: Layout })

defineProps<{
  category: any
  products: any[]
  filters: { sort: string }
  pagination: { page: number; total: number; totalPages: number }
}>()

const formatPrice = (price: number) => `NT$ ${(price / 100).toLocaleString()}`
</script>

<template>
  <Head :title="category.name" />

  <div class="container py-8">
    <h1 class="heading-1 mb-2">{{ category.name }}</h1>
    <p v-if="category.description" class="text-gray-500 mb-6">{{ category.description }}</p>
    <p class="text-sm text-gray-500 mb-8">共 {{ pagination.total }} 件商品</p>

    <div v-if="products.length > 0" class="product-grid">
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
          <h3 class="font-semibold mb-2 line-clamp-2">{{ product.name }}</h3>
          <span class="text-lg font-bold text-primary price">{{ formatPrice(product.price) }}</span>
        </div>
      </a>
    </div>

    <div v-else class="text-center py-16">
      <p class="text-gray-500">此分類尚無商品</p>
    </div>

    <!-- Pagination -->
    <div v-if="pagination.totalPages > 1" class="flex justify-center gap-2 mt-8">
      <a
        v-for="p in pagination.totalPages"
        :key="p"
        :href="`/category/${category.slug}?page=${p}`"
        :class="['btn btn-sm', p === pagination.page ? 'btn-primary' : 'btn-ghost']"
      >
        {{ p }}
      </a>
    </div>
  </div>
</template>
