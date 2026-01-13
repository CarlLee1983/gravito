<template>
  <Layout>
    <div class="max-w-md mx-auto py-12 px-4 sm:px-6">
      <div class="card shadow-xl border-none ring-1 ring-gray-100 relative overflow-hidden">
        <!-- Decoration -->
        <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-600 to-cyan-600" />
        
        <div class="text-center mb-10">
          <div class="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <div class="i-carbon-login text-3xl text-indigo-600" />
          </div>
          <h1 class="text-3xl font-extrabold text-gray-900">{{ t('auth.welcome_back') }}</h1>
          <p class="text-gray-500 mt-2">{{ t('auth.access_dashboard') }}</p>
        </div>
        
        <form @submit.prevent="submit" class="space-y-6">
          <div>
            <label class="label">{{ t('auth.email') }}</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <div class="i-carbon-email" />
              </div>
              <input
                v-model="form.email"
                type="email"
                class="input pl-10"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>
          
          <div>
            <label class="label">{{ t('auth.password') }}</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <div class="i-carbon-password" />
              </div>
              <input
                v-model="form.password"
                type="password"
                class="input pl-10"
                placeholder="••••••••"
                required
              />
            </div>
          </div>
          
          <button type="submit" class="btn btn-primary w-full py-3 text-base shadow-indigo-200" :disabled="form.processing">
            <div v-if="form.processing" class="i-carbon-progress-bar animate-spin mr-2" />
            {{ t('auth.sign_in') }}
          </button>
        </form>
        
        <div class="mt-8 pt-8 border-t border-gray-100">
          <p class="text-center text-sm text-gray-600">
            {{ t('auth.no_account') }}
            <Link href="/register" class="font-bold text-indigo-600 hover:text-indigo-500 transition-colors">
              {{ t('auth.create_account') }}
            </Link>
          </p>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { Link, router } from '@inertiajs/vue3';
import Layout from '../../components/Layout.vue';
import { useI18n } from '../../composables/useI18n';

const { t } = useI18n();

const form = reactive({
  email: '',
  password: '',
  processing: false
});

const submit = () => {
  form.processing = true;
  router.post('/login', form, {
    onFinish: () => form.processing = false
  });
};
</script>
