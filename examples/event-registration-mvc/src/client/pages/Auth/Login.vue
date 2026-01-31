<template>
  <Layout>
    <div class="min-h-[calc(100vh-160px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-base relative overflow-hidden -mt-8 transition-colors duration-500">
      <!-- Sophisticated Background Gradient -->
      <div class="absolute inset-0 z-0">
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,#eff6ff_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_20%_80%,rgba(30,41,59,0.5)_0%,transparent_50%)]" />
        <div class="absolute top-0 left-0 w-[800px] h-[800px] bg-brand-50/50 dark:bg-brand-900/10 rounded-full blur-[120px] opacity-40 translate-x-1/2 -translate-y-1/2" />
      </div>

      <div class="container-wide relative z-10">
        <div class="flex flex-col lg:flex-row-reverse items-stretch bg-card rounded-[3rem] shadow-[0_100px_100px_-50px_rgba(0,0,0,0.1)] dark:shadow-black/50 overflow-hidden border-1 border-gray-100 dark:border-white/5 transition-colors duration-500">
          
          <!-- Left Side (Visual): Dynamic & Inspiring -->
          <div class="hidden lg:flex lg:w-1/2 bg-brand-600 p-16 flex-col justify-between relative overflow-hidden">
            <!-- Glassy Overlay Elements -->
            <div class="absolute top-20 right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
            <div class="absolute bottom-20 left-20 w-48 h-48 bg-cyan-400/20 rounded-full blur-2xl animate-pulse" />
            
            <div class="relative z-10 space-y-8 text-left">
              <Link href="/" class="inline-flex items-center space-x-2 text-white group">
                <div class="w-10 h-10 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform border-1 border-white/30 shadow-inner">
                  <div class="i-carbon-event text-2xl" />
                </div>
                <span class="text-2xl font-black tracking-tighter">GRAVITO</span>
              </Link>

              <div class="space-y-6">
                <h2 class="text-5xl font-black text-white leading-tight tracking-tighter" v-html="t('auth.hero_title')"></h2>
                <p class="text-brand-100 text-lg font-medium leading-relaxed max-w-md">
                  {{ t('auth.hero_desc') }}
                </p>
              </div>
            </div>

            <!-- Dashboard Preview Snippet -->
            <div class="relative z-10 glass p-6 rounded-3xl border-white/20 shadow-2xl">
              <div class="flex items-center space-x-4 mb-6">
                <div class="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center text-brand-600">
                  <div class="i-carbon-notification-new" />
                </div>
                <div class="flex-1">
                  <div class="h-2 w-24 bg-brand-200 dark:bg-brand-800 rounded-full mb-2" />
                  <div class="h-1.5 w-32 bg-brand-100 dark:bg-brand-900/50 rounded-full" />
                </div>
              </div>
              <div class="space-y-3">
                <div class="flex justify-between items-center px-4 py-3 bg-white dark:bg-black/20 rounded-xl border-1 border-gray-100 dark:border-white/5">
                  <span class="text-xs font-bold text-gray-400">{{ t('common.next_event') }}</span>
                  <span class="text-xs font-black text-brand-600 dark:text-brand-400 uppercase">{{ t('common.in_days', { count: 2 }) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Side: Clean & Efficient Form -->
          <div class="flex-1 p-8 sm:p-16 lg:p-24 flex flex-col justify-center">
            <div class="max-w-md mx-auto w-full text-left">
              <div class="mb-12">
                <h1 class="text-4xl font-black text-gray-900 dark:text-white tracking-tighter mb-2">{{ t('auth.welcome_back') }}</h1>
                <p class="text-gray-500 dark:text-slate-400 font-bold text-sm">{{ t('auth.access_dashboard') }}</p>
              </div>

              <form @submit.prevent="submit" class="space-y-6">
                <div class="space-y-2">
                  <label class="label-premium">{{ t('auth.email') }}</label>
                  <div class="relative group">
                    <div class="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 dark:text-slate-600 group-focus-within:text-brand-600 transition-colors">
                      <div class="i-carbon-email text-xl" />
                    </div>
                    <input v-model="form.email" type="email" class="input-premium pl-14" :placeholder="t('auth.placeholder_email')" required />
                  </div>
                </div>

                <div class="space-y-2">
                  <div class="flex justify-between items-end">
                    <label class="label-premium mb-0">{{ t('auth.password') }}</label>
                    <a href="#" class="text-[10px] font-black text-brand-600 dark:text-brand-400 hover:text-brand-700 uppercase tracking-widest transition-colors">{{ t('common.forgot_password') }}</a>
                  </div>
                  <div class="relative group">
                    <div class="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 dark:text-slate-600 group-focus-within:text-brand-600 transition-colors">
                      <div class="i-carbon-password text-xl" />
                    </div>
                    <input v-model="form.password" type="password" class="input-premium pl-14" placeholder="••••••••" required />
                  </div>
                </div>

                <div class="pt-6">
                  <button type="submit" class="btn-primary w-full py-5 text-lg font-black group relative overflow-hidden" :disabled="form.processing">
                    <div v-if="form.processing" class="flex items-center justify-center">
                      <div class="i-carbon-progress-bar animate-spin mr-3" />
                      {{ t('auth.authenticating') }}
                    </div>
                    <div v-else class="flex items-center justify-center">
                      {{ t('auth.sign_in') }}
                      <div class="i-carbon-login ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                </div>
              </form>

              <div class="mt-12 pt-8 border-t border-gray-100 dark:border-white/5">
                <p class="text-center text-sm font-bold text-gray-500 dark:text-slate-500">
                  {{ t('auth.no_account') }}
                  <Link href="/register" class="text-brand-600 dark:text-brand-400 hover:text-brand-700 ml-1">
                    {{ t('auth.create_account') }}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { Link, router } from '@inertiajs/vue3'
import { reactive } from 'vue'
import Layout from '../../components/Layout.vue'
import { useI18n } from '../../composables/useI18n'

const { t } = useI18n()

const form = reactive({
  email: '',
  password: '',
  processing: false,
})

const submit = () => {
  form.processing = true
  router.post('/login', form, {
    onFinish: () => (form.processing = false),
  })
}
</script>
