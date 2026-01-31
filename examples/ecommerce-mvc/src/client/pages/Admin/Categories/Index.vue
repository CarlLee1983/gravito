<script setup lang="ts">
import { Head, router, useForm } from '@inertiajs/vue3'
import { ref } from 'vue'
import AdminLayout from '../../../components/AdminLayout.vue'

defineOptions({ layout: AdminLayout })

const props = defineProps<{
  categories: any[]
}>()

const isEditing = ref(false)
const editingId = ref<number | null>(null)

const form = useForm({
  name: '',
  description: '',
  is_active: true,
})

const startEdit = (category: any) => {
  isEditing.value = true
  editingId.value = category.id
  form.name = category.name
  form.description = category.description
  form.is_active = !!category.is_active
}

const cancelEdit = () => {
  isEditing.value = false
  editingId.value = null
  form.reset()
  form.clearErrors()
}

const submit = () => {
  if (isEditing.value && editingId.value) {
    form.put(`/admin/categories/${editingId.value}`, {
      onSuccess: () => cancelEdit(),
    })
  } else {
    form.post('/admin/categories', {
      onSuccess: () => cancelEdit(),
    })
  }
}

const deleteCategory = async (id: number) => {
  if (!confirm('確定要刪除此分類嗎？包含的商品將變為無分類。')) return
  await fetch(`/admin/categories/${id}`, { method: 'DELETE' })
  router.reload()
}
</script>

<template>
  <Head title="分類管理" />

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
    <!-- List -->
    <div class="lg:col-span-2">
      <h1 class="heading-1 mb-6">分類管理</h1>

      <div class="card overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th class="px-6 py-3 text-left text-sm font-medium">名稱</th>
              <th class="px-6 py-3 text-left text-sm font-medium">描述</th>
              <th class="px-6 py-3 text-left text-sm font-medium">狀態</th>
              <th class="px-6 py-3 text-right text-sm font-medium">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="category in categories" :key="category.id" class="hover:bg-gray-50 dark:hover:bg-gray-800">
              <td class="px-6 py-4 font-medium">{{ category.name }}</td>
              <td class="px-6 py-4 text-sm text-gray-500 line-clamp-1 max-w-xs block">
                {{ category.description || '-' }}
              </td>
              <td class="px-6 py-4">
                <span :class="category.is_active ? 'badge badge-success' : 'badge badge-secondary'">
                  {{ category.is_active ? '啟用' : '停用' }}
                </span>
              </td>
              <td class="px-6 py-4 text-right space-x-2">
                <button @click="startEdit(category)" class="btn btn-sm btn-ghost">編輯</button>
                <button @click="deleteCategory(category.id)" class="btn btn-sm btn-ghost text-red-500">刪除</button>
              </td>
            </tr>
            <tr v-if="categories.length === 0">
              <td colspan="4" class="px-6 py-8 text-center text-gray-500">尚無分類</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Form -->
    <div class="lg:col-span-1">
      <div class="card p-6 sticky top-6">
        <h2 class="text-xl font-bold mb-4">{{ isEditing ? '編輯分類' : '新增分類' }}</h2>
        
        <form @submit.prevent="submit" class="space-y-4">
          <div class="form-group">
            <label class="form-label">分類名稱</label>
            <input v-model="form.name" type="text" class="input" placeholder="例如：3C 配件" />
            <div v-if="form.errors.name" class="form-error">{{ form.errors.name }}</div>
          </div>

          <div class="form-group">
            <label class="form-label">描述</label>
            <textarea v-model="form.description" class="input min-h-[100px]" placeholder="分類描述..."></textarea>
          </div>

          <label class="flex items-center gap-3 cursor-pointer">
            <input v-model="form.is_active" type="checkbox" class="w-5 h-5 text-primary rounded focus:ring-primary" />
            <span class="font-medium">啟用此分類</span>
          </label>

          <div class="flex gap-3 pt-2">
            <button type="submit" class="btn btn-primary flex-1" :disabled="form.processing">
              {{ isEditing ? '更新分類' : '新增分類' }}
            </button>
            <button v-if="isEditing" type="button" @click="cancelEdit" class="btn btn-ghost">
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
