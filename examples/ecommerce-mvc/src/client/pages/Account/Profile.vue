<script setup lang="ts">
import { ref, computed } from 'vue'
import { Head, usePage, router } from '@inertiajs/vue3'
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
      setTimeout(() => { successMessage.value = '' }, 3000)
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
      setTimeout(() => { successMessage.value = '' }, 3000)
    }
  } finally {
    isUpdatingPassword.value = false
  }
}
</script>

<template>
  <Head title="個人資料" />

  <div class="container py-8">
    <h1 class="heading-1 mb-8">個人資料</h1>

    <div v-if="successMessage" class="bg-green-100 text-green-700 p-4 rounded-lg mb-6">
      {{ successMessage }}
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Profile Form -->
      <div class="card p-6">
        <h2 class="heading-3 mb-4">基本資料</h2>
        <form @submit.prevent="updateProfile" class="space-y-4">
          <div class="form-group">
            <label class="label" for="name">姓名</label>
            <input
              id="name"
              v-model="form.name"
              type="text"
              class="input"
              :class="{ 'border-red-500': errors.name }"
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
            />
            <p v-if="errors.email" class="text-red-500 text-sm mt-1">{{ errors.email[0] }}</p>
          </div>

          <button type="submit" :disabled="isUpdating" class="btn btn-primary">
            <span v-if="isUpdating" class="spinner"></span>
            儲存變更
          </button>
        </form>
      </div>

      <!-- Password Form -->
      <div class="card p-6">
        <h2 class="heading-3 mb-4">變更密碼</h2>
        <form @submit.prevent="updatePassword" class="space-y-4">
          <div class="form-group">
            <label class="label" for="current_password">目前密碼</label>
            <input
              id="current_password"
              v-model="passwordForm.current_password"
              type="password"
              class="input"
              :class="{ 'border-red-500': passwordErrors.current_password }"
            />
            <p v-if="passwordErrors.current_password" class="text-red-500 text-sm mt-1">
              {{ passwordErrors.current_password[0] }}
            </p>
          </div>

          <div class="form-group">
            <label class="label" for="new_password">新密碼</label>
            <input
              id="new_password"
              v-model="passwordForm.new_password"
              type="password"
              class="input"
              :class="{ 'border-red-500': passwordErrors.new_password }"
            />
            <p v-if="passwordErrors.new_password" class="text-red-500 text-sm mt-1">
              {{ passwordErrors.new_password[0] }}
            </p>
          </div>

          <div class="form-group">
            <label class="label" for="new_password_confirmation">確認新密碼</label>
            <input
              id="new_password_confirmation"
              v-model="passwordForm.new_password_confirmation"
              type="password"
              class="input"
              :class="{ 'border-red-500': passwordErrors.new_password_confirmation }"
            />
            <p v-if="passwordErrors.new_password_confirmation" class="text-red-500 text-sm mt-1">
              {{ passwordErrors.new_password_confirmation[0] }}
            </p>
          </div>

          <button type="submit" :disabled="isUpdatingPassword" class="btn btn-primary">
            <span v-if="isUpdatingPassword" class="spinner"></span>
            更新密碼
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
