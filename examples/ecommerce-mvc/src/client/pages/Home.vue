<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import Layout from '../components/Layout.vue'
import GImage from '../components/GImage.vue'

defineOptions({ layout: Layout })

defineProps<{
  featuredProducts: any[]
  latestProducts: any[]
  categories: any[]
}>()

const formatPrice = (price: number) => `NT$ ${(price / 100).toLocaleString()}`
</script>

<template>
  <Head title="首頁" />

  <!-- Hero Section -->
  <section class="bg-gradient-to-r from-primary-600 to-secondary text-white py-20">
    <div class="container text-center">
      <h1 class="heading-1 mb-4">歡迎來到 Gravito Shop</h1>
      <p class="text-xl mb-8 opacity-90">使用 Gravito Framework 打造的現代化電商平台</p>
      <a href="/products" class="btn btn-lg bg-white text-primary hover:bg-gray-100">
        探索商品
        <span class="i-heroicons-arrow-right"></span>
      </a>
    </div>
  </section>

  <!-- Categories -->
  <section class="section bg-white dark:bg-gray-800">
    <div class="container">
      <h2 class="heading-2 text-center mb-8">商品分類</h2>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <a
          v-for="category in categories"
          :key="category.id"
          :href="`/category/${category.slug}`"
          class="card card-hover overflow-hidden text-center group"
        >
          <div class="h-40 overflow-hidden">
            <GImage 
              v-if="category.image_url" 
              :src="category.image_url" 
              :alt="category.name"
              class="group-hover:scale-110"
            />
            <div v-else class="w-full h-full bg-primary-100 text-primary flex items-center justify-center">
              <span class="i-heroicons-tag text-4xl"></span>
            </div>
          </div>
          <div class="p-4">
            <h3 class="font-semibold">{{ category.name }}</h3>
            <p class="text-sm text-gray-500">{{ category.product_count || 0 }} 件商品</p>
          </div>
        </a>
      </div>
    </div>
  </section>

  <!-- Featured Products -->
  <section v-if="featuredProducts.length > 0" class="section">
    <div class="container">
      <h2 class="heading-2 text-center mb-8">精選商品</h2>
      <div class="product-grid">
        <a
          v-for="product in featuredProducts"
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
    </div>
  </section>

  <!-- Latest Products -->
  <section class="section bg-gray-50 dark:bg-gray-800">
    <div class="container">
      <div class="flex items-center justify-between mb-8">
        <h2 class="heading-2">最新商品</h2>
        <a href="/products" class="text-primary hover:underline">查看全部 →</a>
      </div>
      <div class="product-grid">
        <a
          v-for="product in latestProducts"
          :key="product.id"
          :href="`/products/${product.slug}`"
          class="card card-hover product-card bg-white dark:bg-gray-700"
        >
          <div class="aspect-square bg-gray-100 dark:bg-gray-600 overflow-hidden">
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
            <span class="text-lg font-bold text-primary price">{{ formatPrice(product.price) }}</span>
          </div>
        </a>
      </div>
    </div>
  </section>
</template>
