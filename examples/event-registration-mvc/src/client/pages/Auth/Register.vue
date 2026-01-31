<template>
  <Layout>
    <div class="min-h-[calc(100vh-160px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-base relative overflow-hidden -mt-8 transition-colors duration-500">
      <!-- High-End Decorative Background -->
      <div class="absolute inset-0 z-0">
        <div class="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_80%_20%,#f5f3ff_0%,transparent:50%)] dark:bg-[radial-gradient(circle_at_80%_20%,rgba(79,70,229,0.1)_0%,transparent:50%)]" />
        <div class="absolute bottom-0 right-0 w-[1000px] h-[1000px] bg-indigo-50/50 dark:bg-indigo-950/10 rounded-full blur-[120px] -translate-x-1/4 translate-y-1/4 opacity-60" />
      </div>

      <div class="container-wide relative z-10">
        <div class="flex flex-col lg:flex-row items-stretch bg-card rounded-[3rem] shadow-[0_100px_100px_-50px_rgba(0,0,0,0.1)] dark:shadow-black/50 overflow-hidden border-1 border-gray-100 dark:border-white/5 transition-colors duration-500">
          
          <!-- Left Side: Emotional & Social Proof -->
          <div class="hidden lg:flex lg:w-1/2 bg-gray-900 dark:bg-[#030712] p-16 flex-col justify-between relative overflow-hidden border-r dark:border-white/5 text-left">
            <div class="absolute inset-0 opacity-20 pointer-events-none">
              <div class="absolute inset-0 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:32px_32px]" />
            </div>
            
            <div class="relative z-10 space-y-12">
              <Link href="/" class="inline-flex items-center space-x-2 text-white group">
                <div class="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform shadow-lg shadow-brand-600/20">
                  <div class="i-carbon-event text-2xl" />
                </div>
                <span class="text-2xl font-black tracking-tighter">GRAVITO</span>
              </Link>

              <div class="space-y-6">
                <div class="inline-flex px-3 py-1 rounded-full bg-brand-500/10 border-1 border-brand-500/20 text-brand-400 text-[10px] font-black uppercase tracking-[0.2em]">
                  {{ t('auth.join_learners') }}
                </div>
                <h2 class="text-5xl font-black text-white leading-tight tracking-tighter" v-html="t('auth.unlock_potential')"></h2>
                <p class="text-gray-400 text-lg font-medium leading-relaxed max-w-md">
                  {{ t('auth.register_desc') }}
                </p>
              </div>

              <div class="space-y-4">
                <div v-for="feature in features" :key="feature" class="flex items-center space-x-3 text-white">
                  <div class="w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400">
                    <div class="i-carbon-checkmark text-sm font-bold" />
                  </div>
                  <span class="text-sm font-bold opacity-80">{{ feature }}</span>
                </div>
              </div>
            </div>

            <div class="relative z-10 pt-12 mt-12 border-t border-white/10">
              <div class="flex items-center space-x-4 mb-4">
                <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" class="w-12 h-12 rounded-full border-2 border-brand-500" />
                <div>
                  <p class="text-white font-black text-sm">{{ t('auth.testimonial_name') }}</p>
                  <p class="text-gray-500 text-xs uppercase font-black tracking-widest">{{ t('auth.testimonial_role') }}</p>
                </div>
              </div>
              <p class="text-gray-400 italic text-sm leading-relaxed">
                {{ t('auth.testimonial_text') }}
              </p>
            </div>
          </div>

          <!-- Right Side: Ultra-Polished Form -->
          <div class="flex-1 p-8 sm:p-16 lg:p-24 flex flex-col justify-center bg-card">
            <div class="max-w-md mx-auto w-full text-left">
              <div class="mb-12">
                <h1 class="text-4xl font-black text-gray-900 dark:text-white tracking-tighter mb-2">{{ t('auth.join_community') }}</h1>
                <p class="text-gray-500 dark:text-slate-400 font-bold text-sm">{{ t('auth.start_journey') }}</p>
              </div>

              <form @submit.prevent="submit" class="space-y-6">
                <div class="space-y-2">
                  <label class="label-premium">{{ t('auth.name') }}</label>
                  <div class="relative group">
                    <div class="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 dark:text-slate-600 group-focus-within:text-brand-600 transition-colors">
                      <div class="i-carbon-user text-xl" />
                    </div>
                    <input v-model="form.name" type="text" class="input-premium pl-14" :placeholder="t('auth.placeholder_name')" required />
                  </div>
                </div>

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
                  <label class="label-premium">{{ t('auth.password') }}</label>
                  <div class="relative group">
                    <div class="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 dark:text-slate-600 group-focus-within:text-brand-600 transition-colors">
                      <div class="i-carbon-password text-xl" />
                    </div>
                    <input v-model="form.password" type="password" class="input-premium pl-14" :placeholder="t('auth.placeholder_password')" required />
                  </div>
                  <div class="flex space-x-1 mt-3 px-1">
                    <div v-for="i in 4" :key="i" class="h-1 flex-1 rounded-full bg-gray-100 dark:bg-white/5" :class="{ 'bg-brand-500': form.password.length > i * 2 }"></div>
                  </div>
                </div>

                <div class="pt-6">
                  <button type="submit" class="btn-primary w-full py-5 text-lg font-black group relative overflow-hidden" :disabled="form.processing">
                    <div v-if="form.processing" class="flex items-center justify-center">
                      <div class="i-carbon-progress-bar animate-spin mr-3" />
                      {{ t('auth.creating_account') }}
                    </div>
                    <div v-else class="flex items-center justify-center">
                      {{ t('auth.create_account') }}
                      <div class="i-carbon-arrow-right ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                </div>
              </form>

              <div class="mt-12 pt-8 border-t border-gray-100 dark:border-white/5">
                <p class="text-center text-sm font-bold text-gray-500 dark:text-slate-500">
                  {{ t('auth.has_account') }}
                  <Link href="/login" class="text-brand-600 dark:text-brand-400 hover:text-brand-700 ml-1">
                    {{ t('auth.sign_in_here') }}
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
import { computed, reactive } from 'vue'
import Layout from '../../components/Layout.vue'
import { useI18n } from '../../composables/useI18n'

const { t } = useI18n()

const form = reactive({
  name: '',
  email: '',
  password: '',
  processing: false,
})

const features = computed(() => [
  t('auth.feature_1'),
  t('auth.feature_2'),
  t('auth.feature_3'),
  t('auth.feature_4'),
])

const submit = () => {
  form.processing = true
  router.post('/register', form, {
    onFinish: () => (form.processing = false),
  })
}
</script>
