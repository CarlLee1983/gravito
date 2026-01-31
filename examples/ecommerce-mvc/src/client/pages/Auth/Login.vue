<script setup lang="ts">
import { router, usePage } from '@inertiajs/vue3'
import { computed, ref } from 'vue'
import Layout from '../../components/Layout.vue'

defineOptions({ layout: Layout })

const page = usePage()
const flash = computed(() => page.props.flash as any)

const form = ref({
  email: '',
  password: '',
})
const isLoading = ref(false)
const errors = computed(() => flash.value?.errors || {})

const submit = () => {
  isLoading.value = true
  router.post('/login', form.value, {
    onFinish: () => {
      isLoading.value = false
    },
  })
}
</script>

<template>
  <Head title="登入" />

  <div class="min-h-[80vh] flex items-center justify-center py-12">
    <div class="card p-8 w-full max-w-md">
      <h1 class="heading-2 text-center mb-8">登入帳號</h1>

      <form @submit.prevent="submit" class="space-y-4">
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
            placeholder="••••••••"
            required
          />
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="btn btn-primary w-full"
        >
          <span v-if="isLoading" class="spinner"></span>
          登入
        </button>
      </form>

      <p class="text-center mt-6 text-gray-600 dark:text-gray-400">
        還沒有帳號？
        <a href="/register" class="text-primary hover:underline">立即註冊</a>
      </p>
    </div>
  </div>
</template>
