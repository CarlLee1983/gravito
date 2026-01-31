<script setup lang="ts">
import { Head, Link, router } from '@inertiajs/vue3'
import { ref } from 'vue'
import AdminLayout from '../../../components/AdminLayout.vue'
import GImage from '../../../components/GImage.vue'

defineOptions({ layout: AdminLayout })

defineProps<{
  products: any[]
  filters: { search: string }
  pagination: { page: number; perPage: number; total: number; totalPages: number }
}>()

const search = ref('')

const formatPrice = (price: number) => `NT$ ${(price / 100).toLocaleString()}`

const doSearch = () => {
  router.get('/admin/products', { search: search.value }, { preserveState: true })
}

const deleteProduct = async (id: number) => {
  if (!confirm('確定要刪除此商品嗎？')) return
  await fetch(`/admin/products/${id}`, { method: 'DELETE' })
  router.reload()
}
</script>

<template>
  <Head title="商品管理" />

  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="heading-1">商品管理</h1>
      <Link href="/admin/products/create" class="btn btn-primary">
        <span class="i-heroicons-plus"></span>
        新增商品
      </Link>
    </div>

    <!-- Search -->
    <div class="card p-4 mb-6">
      <form @submit.prevent="doSearch" class="flex gap-4">
        <input
          v-model="search"
          type="text"
          placeholder="搜尋商品名稱..."
          class="input"
        />
        <button type="submit" class="btn btn-primary">搜尋</button>
      </form>
    </div>

    <!-- Products Table -->
    <div class="card overflow-hidden">
      <table class="w-full">
        <thead class="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th class="px-6 py-3 text-left text-sm font-medium">商品</th>
            <th class="px-6 py-3 text-left text-sm font-medium">分類</th>
            <th class="px-6 py-3 text-left text-sm font-medium">價格</th>
            <th class="px-6 py-3 text-left text-sm font-medium">庫存</th>
            <th class="px-6 py-3 text-left text-sm font-medium">狀態</th>
            <th class="px-6 py-3 text-right text-sm font-medium">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
          <tr v-for="product in products" :key="product.id" class="hover:bg-gray-50 dark:hover:bg-gray-800">
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden">
                  <GImage
                    v-if="product.image_url"
                    :src="product.image_url"
                    :alt="product.name"
                    class="w-full h-full object-cover"
                  />
                </div>
                <span class="font-medium">{{ product.name }}</span>
              </div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-500">{{ product.category_name || '-' }}</td>
            <td class="px-6 py-4 font-medium price">{{ formatPrice(product.price) }}</td>
            <td class="px-6 py-4">
              <span :class="product.stock > 10 ? 'text-green-600' : product.stock > 0 ? 'text-yellow-600' : 'text-red-600'">
                {{ product.stock }}
              </span>
            </td>
            <td class="px-6 py-4">
              <span :class="product.is_active ? 'badge badge-success' : 'badge badge-danger'">
                {{ product.is_active ? '上架' : '下架' }}
              </span>
            </td>
            <td class="px-6 py-4 text-right">
              <Link :href="`/admin/products/${product.id}/edit`" class="btn btn-sm btn-ghost">編輯</Link>
              <button @click="deleteProduct(product.id)" class="btn btn-sm btn-ghost text-red-500">刪除</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="products.length === 0" class="p-8 text-center text-gray-500">
        尚無商品
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="pagination.totalPages > 1" class="flex justify-center gap-2 mt-6">
      <Link
        v-for="p in pagination.totalPages"
        :key="p"
        :href="`/admin/products?page=${p}`"
        :class="['btn btn-sm', p === pagination.page ? 'btn-primary' : 'btn-ghost']"
      >
        {{ p }}
      </Link>
    </div>
  </div>
</template>
