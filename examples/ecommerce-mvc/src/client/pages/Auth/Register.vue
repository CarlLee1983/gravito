<script setup lang="ts">
import { ref, computed } from 'vue'
import { Head, usePage, router } from '@inertiajs/vue3'
import Layout from '../../components/Layout.vue'

defineOptions({ layout: Layout })

const page = usePage()
const flash = computed(() => page.props.flash as any)

const form = ref({
  name: flash.value?.old?.name || '',
  email: flash.value?.old?.email || '',
  password: '',
  password_confirmation: '',
})
const isLoading = ref(false)
const errors = computed(() => flash.value?.errors || {})

const submit = () => {
  isLoading.value = true
  router.post('/register', form.value, {
    onFinish: () => {
      isLoading.value = false
    },
  })
}
</script>

<template>
  <Head title="註冊" />

  <div class="min-h-[80vh] flex items-center justify-center py-12">
    <div class="card p-8 w-full max-w-md">
      <h1 class="heading-2 text-center mb-8">建立帳號</h1>

      <form @submit.prevent="submit" class="space-y-4">
        <div class="form-group">
          <label class="label" for="name">姓名</label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            class="input"
            :class="{ 'border-red-500': errors.name }"
            required
          />
          <p v-if="errors.name" class="text-red-500 text-sm mt-1">{{ errors.name[0] }}</p>
        </div>

        <div class="form-group">
          <label class="label" for="email">電子郵件</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            class="input"
            :class="{ 'border-red-500': errors.email }"
            placeholder="you@example.com"
            required
          />
          <p v-if="errors.email" class="text-red-500 text-sm mt-1">{{ errors.email[0] }}</p>
        </div>

        <div class="form-group">
          <label class="label" for="password">密碼</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            class="input"
            :class="{ 'border-red-500': errors.password }"
            placeholder="至少 6 個字元"
            required
          />
          <p v-if="errors.password" class="text-red-500 text-sm mt-1">{{ errors.password[0] }}</p>
        </div>

        <div class="form-group">
          <label class="label" for="password_confirmation">確認密碼</label>
          <input
            id="password_confirmation"
            v-model="form.password_confirmation"
            type="password"
            class="input"
            :class="{ 'border-red-500': errors.password_confirmation }"
            required
          />
          <p v-if="errors.password_confirmation" class="text-red-500 text-sm mt-1">
            {{ errors.password_confirmation[0] }}
          </p>
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="btn btn-primary w-full"
        >
          <span v-if="isLoading" class="spinner"></span>
          註冊
        </button>
      </form>

      <p class="text-center mt-6 text-gray-600 dark:text-gray-400">
        已有帳號？
        <a href="/login" class="text-primary hover:underline">立即登入</a>
      </p>
    </div>
  </div>
</template>
