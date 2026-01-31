<script setup lang="ts">
import { router, useForm } from '@inertiajs/vue3'
import { ref } from 'vue'
import Layout from '../../components/Layout.vue'

defineOptions({ layout: Layout })

const props = defineProps<{
  addresses: any[]
}>()

const form = useForm({
  name: '',
  phone: '',
  city: '',
  district: '',
  street: '',
  zip_code: '',
  is_default: false,
})

const showForm = ref(false)

const submit = () => {
  form.post('/account/addresses', {
    onSuccess: () => {
      form.reset()
      showForm.value = false
    },
  })
}

const remove = (id: number) => {
  if (confirm('確定要刪除此地址嗎？')) {
    router.delete(`/account/addresses/${id}`)
  }
}

const setDefault = (id: number) => {
  router.put(`/account/addresses/${id}/default`)
}
</script>

<template>
  <Head title="收件地址" />

  <div class="bg-gray-50 dark:bg-gray-900 min-h-screen py-10">
    <div class="container max-w-5xl">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Sidebar Navigation -->
        <div class="md:col-span-1 space-y-4">
           <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 sticky top-24">
              <nav class="space-y-1">
                <a href="/account/profile" class="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl font-medium transition-colors">
                  <span class="i-heroicons-user text-xl"></span> 基本資料
                </a>
                <a href="/account/orders" class="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl font-medium transition-colors">
                  <span class="i-heroicons-shopping-bag text-xl"></span> 訂單紀錄
                </a>
                <a href="/account/wishlist" class="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl font-medium transition-colors">
                  <span class="i-heroicons-heart text-xl"></span> 收藏清單
                </a>
                <span class="flex items-center gap-3 px-4 py-3 text-primary bg-primary-50 dark:bg-primary-900/20 rounded-xl font-medium transition-colors">
                  <span class="i-heroicons-map-pin text-xl"></span> 收件地址
                </span>
              </nav>
           </div>
        </div>

        <!-- Main Content -->
        <div class="md:col-span-2 space-y-6">
           <div class="flex items-center justify-between">
                <h1 class="text-2xl font-bold flex items-center gap-3 text-gray-900 dark:text-white">
                  <span class="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                    <span class="i-heroicons-map-pin text-primary text-xl block"></span>
                  </span>
                  收件地址
                </h1>
                <button @click="showForm = !showForm" class="btn btn-primary px-4 py-2 rounded-xl flex items-center gap-2">
                    <span class="i-heroicons-plus text-lg"></span> 新增地址
                </button>
            </div>

            <!-- New Address Form -->
             <div v-show="showForm" class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 animate-fade-in-down">
                <h3 class="text-lg font-bold mb-4 text-gray-900 dark:text-white">新增收件地址</h3>
                <form @submit.prevent="submit" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">收件人姓名</label>
                        <input v-model="form.name" type="text" class="input w-full" required placeholder="請填寫真實姓名" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">聯絡電話</label>
                        <input v-model="form.phone" type="tel" class="input w-full" required placeholder="手機號碼" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">郵遞區號</label>
                        <input v-model="form.zip_code" type="text" class="input w-full" placeholder="例如：100" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">縣市</label>
                        <input v-model="form.city" type="text" class="input w-full" required placeholder="例如：台北市" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">區域</label>
                        <input v-model="form.district" type="text" class="input w-full" required placeholder="例如：中正區" />
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">詳細地址</label>
                        <input v-model="form.street" type="text" class="input w-full" required placeholder="街道、樓層等資訊" />
                    </div>
                    <div class="md:col-span-2 flex items-center gap-2 mt-2">
                        <input v-model="form.is_default" type="checkbox" id="is_default" class="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary" />
                        <label for="is_default" class="text-sm text-gray-700 dark:text-gray-300 select-none cursor-pointer">設為預設地址</label>
                    </div>
                    <div class="md:col-span-2 flex justify-end gap-3 mt-4">
                        <button type="button" @click="showForm = false" class="btn btn-outline px-6 rounded-xl">取消</button>
                        <button type="submit" class="btn btn-primary px-6 rounded-xl" :disabled="form.processing">
                            <span v-if="form.processing" class="i-heroicons-arrow-path animate-spin mr-2"></span>
                            儲存地址
                        </button>
                    </div>
                </form>
             </div>

            <!-- Address List -->
            <div class="grid grid-cols-1 gap-4">
              <div 
                v-for="address in addresses" 
                :key="address.id" 
                class="bg-white dark:bg-gray-800 rounded-2xl p-6 border transition-all"
                :class="[
                    address.is_default 
                    ? 'border-primary shadow-md shadow-primary/5 dark:border-primary/50' 
                    : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'
                ]"
              >
                 <div class="flex items-start justify-between">
                     <div>
                         <div class="flex items-center gap-2 mb-2">
                             <h3 class="font-bold text-lg text-gray-900 dark:text-white">{{ address.name }}</h3>
                             <span v-if="address.is_default" class="px-2 py-0.5 text-xs bg-primary text-white rounded-full">預設</span>
                         </div>
                         <p class="text-gray-600 dark:text-gray-400 mb-1">{{ address.phone }}</p>
                         <p class="text-gray-600 dark:text-gray-400">
                             {{ address.zip_code }} {{ address.city }}{{ address.district }}{{ address.street }}
                         </p>
                     </div>
                     <div class="flex items-center gap-2">
                         <button v-if="!address.is_default" @click="setDefault(address.id)" class="text-sm text-gray-500 hover:text-primary underline">設為預設</button>
                         <div class="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>
                         <button @click="remove(address.id)" class="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                             <span class="i-heroicons-trash text-lg"></span>
                         </button>
                     </div>
                 </div>
              </div>

               <div v-if="addresses.length === 0 && !showForm" class="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                  <div class="w-20 h-20 bg-gray-50 dark:bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span class="i-heroicons-map-pin text-3xl text-gray-300 dark:text-gray-500"></span>
                  </div>
                  <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-2">還沒有設定收件地址</h2>
                  <p class="text-gray-500 dark:text-gray-400 mb-6 text-sm">新增地址以加快結帳速度</p>
                  <button @click="showForm = true" class="btn btn-outline px-6 rounded-xl">
                     立即新增
                  </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  </div>
</template>
