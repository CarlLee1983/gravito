<script setup lang="ts">
import { usePage } from '@inertiajs/vue3'
import { computed, ref } from 'vue'
import Layout from '../../components/Layout.vue'

defineOptions({ layout: Layout })

const page = usePage()
const flash = computed(() => page.props.flash as any)

const props = defineProps<{
  user: {
    id: number
    name: string
    email: string
    created_at: string
  }
}>()

const form = ref({
  name: props.user.name,
  email: props.user.email,
})
const passwordForm = ref({
  current_password: '',
  new_password: '',
  new_password_confirmation: '',
})

const isUpdating = ref(false)
const isUpdatingPassword = ref(false)
const errors = ref<Record<string, string[]>>({})
const passwordErrors = ref<Record<string, string[]>>({})
const successMessage = ref('')

const updateProfile = async () => {
  isUpdating.value = true
  errors.value = {}
  try {
    const response = await fetch('/account/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value),
    })
    const data = await response.json()
    if (data.errors) {
      errors.value = data.errors
    } else {
      successMessage.value = '個人資料已更新'
      setTimeout(() => {
        successMessage.value = ''
      }, 3000)
    }
  } finally {
    isUpdating.value = false
  }
}

const updatePassword = async () => {
  isUpdatingPassword.value = true
  passwordErrors.value = {}
  try {
    const response = await fetch('/account/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(passwordForm.value),
    })
    const data = await response.json()
    if (data.errors) {
      passwordErrors.value = data.errors
    } else {
      successMessage.value = '密碼已更新'
      passwordForm.value = { current_password: '', new_password: '', new_password_confirmation: '' }
      setTimeout(() => {
        successMessage.value = ''
      }, 3000)
    }
  } finally {
    isUpdatingPassword.value = false
  }
}
</script>

<template>
  <Head title="個人資料" />

  <div class="bg-gray-50 dark:bg-gray-900 min-h-screen py-10">
    <div class="container max-w-5xl">

      <!-- Profile Header Card -->
      <div class="bg-white dark:bg-gray-800 rounded-3xl p-8 mb-8 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group">
        <!-- Decoration Background -->
        <div class="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-transform duration-700 group-hover:scale-125"></div>
        
        <!-- Avatar Section -->
        <div class="relative shrink-0">
          <div class="w-32 h-32 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-5xl font-bold shadow-lg ring-4 ring-white dark:ring-gray-800">
            {{ user.name.charAt(0).toUpperCase() }}
          </div>
          <button class="absolute bottom-0 right-0 bg-white dark:bg-gray-700 p-2 rounded-full shadow-md text-gray-500 hover:text-primary transition-colors border border-gray-200 dark:border-gray-600">
            <span class="i-heroicons-camera text-xl block"></span>
          </button>
        </div>

        <!-- Info Section -->
        <div class="text-center md:text-left flex-1 relative z-10">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">{{ user.name }}</h1>
          <p class="text-gray-500 dark:text-gray-400 mb-4 flex items-center justify-center md:justify-start gap-2">
            <span class="i-heroicons-envelope"></span>
            {{ user.email }}
            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 ml-2">已驗證</span>
          </p>
          <div class="flex flex-wrap gap-3 justify-center md:justify-start">
             <div class="bg-gray-50 dark:bg-gray-700/50 px-4 py-2 rounded-xl text-sm border border-gray-200 dark:border-gray-700">
                <span class="block text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-0.5">會員等級</span>
                <span class="font-bold text-primary flex items-center gap-1">
                  <span class="i-heroicons-star-solid"></span> 黃金會員
                </span>
             </div>
             <div class="bg-gray-50 dark:bg-gray-700/50 px-4 py-2 rounded-xl text-sm border border-gray-200 dark:border-gray-700">
                <span class="block text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-0.5">加入時間</span>
                <span class="font-semibold text-gray-700 dark:text-gray-300">{{ new Date(user.created_at).toLocaleDateString() }}</span>
             </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Sidebar Navigation -->
        <div class="md:col-span-1 space-y-4">
           <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <nav class="space-y-1">
                <a href="#basic-info" class="flex items-center gap-3 px-4 py-3 text-primary bg-primary-50 dark:bg-primary-900/20 rounded-xl font-medium transition-colors">
                  <span class="i-heroicons-user text-xl"></span> 基本資料
                </a>
                <a href="/account/orders" class="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl font-medium transition-colors">
                  <span class="i-heroicons-shopping-bag text-xl"></span> 訂單紀錄
                </a>
                <a href="/account/wishlist" class="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl font-medium transition-colors">
                  <span class="i-heroicons-heart text-xl"></span> 收藏清單
                </a>
                <a href="/account/addresses" class="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl font-medium transition-colors">
                  <span class="i-heroicons-map-pin text-xl"></span> 收件地址
                </a>
              </nav>
           </div>
        </div>

        <!-- Main Content Forms -->
        <div class="md:col-span-2 space-y-8">
            <div v-if="successMessage" class="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-3 rounded-xl border border-green-200 animate-fade-in-down">
                <span class="i-heroicons-check-circle text-xl"></span>
                {{ successMessage }}
            </div>

            <!-- Edit Profile Form -->
            <div id="basic-info" class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-xl font-bold flex items-center gap-2">
                        <span class="w-1 h-6 bg-primary rounded-full"></span>
                        編輯資料
                    </h2>
                </div>
                
                <form @submit.prevent="updateProfile" class="space-y-5">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div class="space-y-2">
                            <label class="text-sm font-semibold text-gray-700 dark:text-gray-300">姓名</label>
                            <input id="name" v-model="form.name" type="text" class="input" :class="{ 'ring-2 ring-red-500/50 border-red-500': errors.name }" placeholder="您的姓名" />
                            <p v-if="errors.name" class="text-red-500 text-xs flex items-center gap-1 mt-1">
                                <span class="i-heroicons-exclamation-circle"></span> {{ errors.name[0] }}
                            </p>
                        </div>
                        <div class="space-y-2">
                             <label class="text-sm font-semibold text-gray-700 dark:text-gray-300">電子郵件</label>
                             <input id="email" v-model="form.email" type="email" class="input bg-gray-50 text-gray-500 cursor-not-allowed" disabled />
                             <p class="text-xs text-gray-400">電子郵件無法修改，請聯繫客服。</p>
                        </div>
                    </div>

                    <div class="pt-2 flex justify-end">
                         <button type="submit" :disabled="isUpdating" class="btn btn-primary px-6 rounded-xl shadow-lg shadow-primary/30">
                            <span v-if="isUpdating" class="i-heroicons-arrow-path animate-spin mr-2"></span>
                            儲存變更
                         </button>
                    </div>
                </form>
            </div>

            <!-- Password Change Form -->
             <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                        <span class="w-1 h-6 bg-secondary rounded-full"></span>
                        安全設定
                    </h2>
                </div>

                <form @submit.prevent="updatePassword" class="space-y-5">
                    <div class="space-y-2">
                        <label class="text-sm font-semibold text-gray-700 dark:text-gray-300">目前密碼</label>
                        <input id="current_password" v-model="passwordForm.current_password" type="password" class="input" :class="{ 'border-red-500': passwordErrors.current_password }" placeholder="••••••••" />
                        <p v-if="passwordErrors.current_password" class="text-red-500 text-xs mt-1">{{ passwordErrors.current_password[0] }}</p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div class="space-y-2">
                            <label class="text-sm font-semibold text-gray-700 dark:text-gray-300">新密碼</label>
                            <input id="new_password" v-model="passwordForm.new_password" type="password" class="input" :class="{ 'border-red-500': passwordErrors.new_password }" placeholder="••••••••" />
                            <p v-if="passwordErrors.new_password" class="text-red-500 text-xs mt-1">{{ passwordErrors.new_password[0] }}</p>
                        </div>
                        <div class="space-y-2">
                            <label class="text-sm font-semibold text-gray-700 dark:text-gray-300">確認新密碼</label>
                            <input id="new_password_confirmation" v-model="passwordForm.new_password_confirmation" type="password" class="input" :class="{ 'border-red-500': passwordErrors.new_password_confirmation }" placeholder="••••••••" />
                        </div>
                    </div>

                     <div class="pt-2 flex justify-end">
                         <button type="submit" :disabled="isUpdatingPassword" class="btn bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 px-6 rounded-xl">
                            <span v-if="isUpdatingPassword" class="i-heroicons-arrow-path animate-spin mr-2"></span>
                            更新密碼
                         </button>
                    </div>
                </form>
             </div>
        </div>
      </div>
    </div>
  </div>
</template>
