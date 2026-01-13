<script setup lang="ts">
import { reactive, ref } from 'vue'
import { Head, Link, router } from '@inertiajs/vue3'
import AdminLayout from '../../../components/AdminLayout.vue'

defineOptions({ layout: AdminLayout })

const props = defineProps<{
  product: any
  categories: any[]
}>()

const form = reactive({
  name: props.product.name,
  category_id: props.product.category_id,
  description: props.product.description,
  price: props.product.price,
  compare_at_price: props.product.compare_at_price,
  stock: props.product.stock,
  image_url: props.product.image_url,
  is_active: !!props.product.is_active,
  is_featured: !!props.product.is_featured,
})

const processing = ref(false)
const errors = ref<Record<string, string>>({})

const submit = () => {
  if (!props.product.id) {
    console.error('Product ID is missing', props.product)
    alert('錯誤：無法取得商品 ID')
    return
  }

  if (processing.value) {
    return
  }

  processing.value = true
  errors.value = {}

  router.put(`/admin/products/${props.product.id}`, form, {
    preserveScroll: true,
    preserveState: true,
    onError: (err) => {
      errors.value = err as Record<string, string>
      processing.value = false
    },
    onSuccess: () => {
      processing.value = false
    },
    onFinish: () => {
      processing.value = false
    },
  })
}
</script>

<template>
  <Head title="編輯商品" />

  <div class="max-w-4xl mx-auto">
    <div class="flex items-center gap-4 mb-6">
      <Link href="/admin/products" class="btn btn-ghost rounded-full p-2">
        <span class="i-heroicons-arrow-left text-xl"></span>
      </Link>
      <h1 class="heading-1 m-0">編輯商品</h1>
    </div>

    <div class="card p-6">
      <form @submit.prevent class="space-y-6">
        <!-- Name -->
        <div class="form-group">
          <label class="form-label">商品名稱</label>
          <input v-model="form.name" type="text" class="input" placeholder="例如：無線耳機" />
          <div v-if="errors.name" class="form-error">{{ errors.name }}</div>
        </div>

        <!-- Category -->
        <div class="form-group">
          <label class="form-label">分類</label>
          <select v-model="form.category_id" class="input">
            <option :value="null">無分類</option>
            <option v-for="category in categories" :key="category.id" :value="category.id">
              {{ category.name }}
            </option>
          </select>
        </div>

        <!-- Description -->
        <div class="form-group">
          <label class="form-label">商品描述</label>
          <textarea v-model="form.description" class="input min-h-[120px]" placeholder="輸入商品詳細介紹..."></textarea>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Price -->
          <div class="form-group">
            <label class="form-label">價格 (NT$)</label>
            <input v-model="form.price" type="number" class="input" min="0" />
            <div v-if="errors.price" class="form-error">{{ errors.price }}</div>
          </div>

          <!-- Compare Price -->
          <div class="form-group">
            <label class="form-label">原價 (選填)</label>
            <input v-model="form.compare_at_price" type="number" class="input" min="0" />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Stock -->
          <div class="form-group">
            <label class="form-label">庫存數量</label>
            <input v-model="form.stock" type="number" class="input" min="0" />
            <div v-if="errors.stock" class="form-error">{{ errors.stock }}</div>
          </div>

          <!-- Image URL -->
          <div class="form-group">
            <label class="form-label">圖片網址</label>
            <input v-model="form.image_url" type="url" class="input" placeholder="https://..." />
          </div>
        </div>

        <div class="flex gap-8 border-t border-gray-100 dark:border-gray-700 pt-6">
          <!-- Active -->
          <label class="flex items-center gap-3 cursor-pointer">
            <input v-model="form.is_active" type="checkbox" class="w-5 h-5 text-primary rounded focus:ring-primary" />
            <span class="font-medium">上架販售</span>
          </label>

          <!-- Featured -->
          <label class="flex items-center gap-3 cursor-pointer">
            <input v-model="form.is_featured" type="checkbox" class="w-5 h-5 text-primary rounded focus:ring-primary" />
            <span class="font-medium">精選商品</span>
          </label>
        </div>

        <div class="flex justify-end gap-4 pt-4">
          <Link href="/admin/products" class="btn btn-ghost">取消</Link>
          <button type="button" @click="submit" class="btn btn-primary" :disabled="processing">
            {{ processing ? '儲存中...' : '儲存變更' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
